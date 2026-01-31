import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNotifications } from './NotificationContext';
import { useSession } from './SessionContext';
import type { DetectionResult } from '../services/api';

interface DetectionContextType {
    isConnected: boolean;
    isDeepfake: boolean;
    currentConfidence: number;
    history: { time: number, value: number, isDeepfake: boolean }[];
    audioStream: MediaStream | null;
    audioContext: AudioContext | null; // Kept for visualizer but not used for transport
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    connectionState: string; // RTCIceConnectionState can be 'new' | 'checking' | ...
    stats: { rtt: number, packetsLost: number, bytesReceived: number };
}

const defaultContext: DetectionContextType = {
    isConnected: false,
    isDeepfake: false,
    currentConfidence: 0,
    history: [],
    audioStream: null,
    audioContext: null,
    startRecording: async () => { },
    stopRecording: () => { },
    connectionState: 'new',
    stats: { rtt: 0, packetsLost: 0, bytesReceived: 0 }
};

const DetectionContext = createContext<DetectionContextType>(defaultContext);

export const DetectionProvider = ({ children }: { children: ReactNode }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [currentConfidence, setCurrentConfidence] = useState(0);
    const [isDeepfake, setIsDeepfake] = useState(false);
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [history, setHistory] = useState<{ time: number, value: number, isDeepfake: boolean }[]>([]);
    const [connectionState, setConnectionState] = useState<RTCIceConnectionState>('new');
    const [stats, setStats] = useState({ rtt: 0, packetsLost: 0, bytesReceived: 0 });

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { addNotification } = useNotifications();
    const { stopSession } = useSession();
    const historyStartTime = useRef(Date.now());

    const stopRecording = useCallback(() => {
        setIsConnected(false);
        setConnectionState('closed');
        setStats({ rtt: 0, packetsLost: 0, bytesReceived: 0 });

        // Clear stats interval
        if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
            statsIntervalRef.current = null;
        }

        // Close WebRTC
        if (dcRef.current) {
            dcRef.current.close();
            dcRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }

        // Close Audio Context (Visualizer)
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setAudioContext(null);

        // Stop Stream Tracks
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            setAudioStream(null);
        }

        stopSession(); // Update session state
    }, [audioStream, stopSession]);

    const startRecording = useCallback(async () => {
        try {
            setConnectionState('checking');
            // 1. Get Microphone
            console.log("STEP 1: Requesting Microphone Access...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("STEP 1.1: Microphone Acquired", stream.id);
            setAudioStream(stream);
            console.log("Microphone Stream", stream);
            // 2. Setup Audio Context for Visualizer (Local only)
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            setAudioContext(audioCtx);

            // 3. Setup WebRTC Peer Connection
            console.log("STEP 2: Creating RTCPeerConnection");
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            pcRef.current = pc;

            // Monitor Connection State
            pc.oniceconnectionstatechange = () => {
                console.log("STEP ICE: ICE Connection State Changed ->", pc.iceConnectionState);
                setConnectionState(pc.iceConnectionState);
                if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                    addNotification('network', `Connection unstable: ${pc.iceConnectionState}`);
                }
            };

            pc.onicegatheringstatechange = () => {
                console.log("STEP ICE: ICE Gathering State Changed ->", pc.iceGatheringState);
            }

            // Add Audio Tracks
            stream.getTracks().forEach(track => {
                console.log("STEP 2.1: Adding Audio Track to PC", track.kind);
                pc.addTrack(track, stream)
            });

            // Create Data Channel for Results
            const dc = pc.createDataChannel("results");
            dcRef.current = dc;
            console.log("STEP 3: Created Data Channel 'results'");

            dc.onopen = () => {
                console.log("STEP 5: WebRTC Data Channel OPEN");
                setIsConnected(true);
                historyStartTime.current = Date.now();
                addNotification('info', 'Secured Audio Link Established (WebRTC)');
            };

            dc.onmessage = (event) => {
                try {
                    // console.log("STEP 6: Received message", event.data); // Too spammy? Maybe log 1 in 10?
                    const message = JSON.parse(event.data);
                    if (message.type === 'detection_result') {
                        const result = message.data as DetectionResult;
                        setCurrentConfidence(result.confidence);
                        const isDf = result.status === 'deepfake';
                        setIsDeepfake(isDf);

                        const now = Date.now();
                        const time = (now - historyStartTime.current) / 1000;
                        setHistory(prev => {
                            const newPoint = { time, value: result.confidence, isDeepfake: isDf };
                            const newHistory = [...prev, newPoint];
                            if (newHistory.length > 50) return newHistory.slice(newHistory.length - 50);
                            return newHistory;
                        });

                        if (isDf && result.confidence > 80) {
                            addNotification('deepfake', `Deepfake Detected (${result.confidence.toFixed(1)}%)`);
                        }
                    }
                } catch (e) {
                    console.error("Error parsing DC message", e);
                }
            };

            // Stats Loop
            const statsInterval = setInterval(async () => {
                if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                    const report = await pc.getStats();
                    let newStats = { rtt: 0, packetsLost: 0, bytesReceived: 0 };

                    report.forEach(stat => {
                        if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                            newStats.rtt = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : 0;
                        }
                        if (stat.type === 'inbound-rtp') {
                            newStats.packetsLost += stat.packetsLost || 0;
                            newStats.bytesReceived += stat.bytesReceived || 0;
                        }
                    });
                    setStats(newStats);
                }
            }, 1000);
            statsIntervalRef.current = statsInterval;

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'closed') {
                    if (statsIntervalRef.current) {
                        clearInterval(statsIntervalRef.current);
                        statsIntervalRef.current = null;
                    }
                }
            };

            // Negotiate
            console.log("STEP 3.1: Creating Connection Offer...");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log("STEP 3.2: Local Description Set (Offer)");

            // Wait for ICE gathering to complete (simple way)
            await new Promise<void>(resolve => {
                if (pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    const checkIce = () => {
                        if (pc.iceGatheringState === 'complete') {
                            pc.removeEventListener('icegatheringstatechange', checkIce);
                            resolve();
                        }
                    };
                    pc.addEventListener('icegatheringstatechange', checkIce);
                    // Timeout fallback?
                    setTimeout(resolve, 2000);
                }
            });

            // Send Offer to Backend
            console.log("STEP 3.3: Sending Offer to Backend API...");
            const response = await fetch('http://localhost:8000/api/v1/webrtc/offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sdp: pc.localDescription?.sdp,
                    type: pc.localDescription?.type
                })
            });

            const answer = await response.json();
            console.log("STEP 3.4: Received Answer from Backend");
            await pc.setRemoteDescription(answer);
            console.log("STEP 3.5: Remote Description Set (Answer)");

        } catch (err) {
            console.error("WebRTC Initialization failed", err);
            addNotification('error', 'Connection Failed: Could not start secure stream.');
            stopRecording();
        }
    }, [addNotification, stopRecording]);

    // Cleanup
    useEffect(() => {
        return () => {
            // Only cleanup if component unmounts, not on every render
            // But we can't call stopRecording here easily without dependency loop if not careful
            // For now, rely on manual stop or page refresh
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
                statsIntervalRef.current = null;
            }
        };
    }, []);

    return (
        <DetectionContext.Provider value={{ isConnected, currentConfidence, isDeepfake, history, audioStream, audioContext, startRecording, stopRecording, connectionState, stats }}>
            {children}
        </DetectionContext.Provider>
    );
};

export const useDetection = () => {
    return useContext(DetectionContext);
};
