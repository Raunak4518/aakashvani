import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNotifications } from './NotificationContext';
import { useSession } from './SessionContext';
import type { DetectionResult } from '../services/api';

// Stored detection result for history
export interface StoredDetection {
    id: string;
    timestamp: number;
    status: 'authentic' | 'deepfake' | 'uncertain';
    confidence: number;
    duration: number;
    method: string;
}

interface DetectionContextType {
    isConnected: boolean;
    isDeepfake: boolean;
    currentConfidence: number;
    history: { time: number, value: number, isDeepfake: boolean }[];
    detectionHistory: StoredDetection[]; // Persisted session history
    audioStream: MediaStream | null;
    audioContext: AudioContext | null;
    startRecording: (deviceId?: string) => Promise<void>;
    stopRecording: () => void;
    connectionState: string;
    stats: { rtt: number, packetsLost: number, bytesReceived: number };
    saveCurrentSession: () => void; // Save current session to history
    clearHistory: () => void; // Clear all stored history
    currentSource: string; // Currently active audio source
}

const STORAGE_KEY = 'aakashvani_detection_history';

const loadStoredHistory = (): StoredDetection[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveStoredHistory = (history: StoredDetection[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Failed to save history to localStorage:', e);
    }
};

const defaultContext: DetectionContextType = {
    isConnected: false,
    isDeepfake: false,
    currentConfidence: 0,
    history: [],
    detectionHistory: [],
    audioStream: null,
    audioContext: null,
    startRecording: async () => { },
    stopRecording: () => { },
    connectionState: 'new',
    stats: { rtt: 0, packetsLost: 0, bytesReceived: 0 },
    saveCurrentSession: () => { },
    clearHistory: () => { },
    currentSource: 'default'
};

const DetectionContext = createContext<DetectionContextType>(defaultContext);

export const DetectionProvider = ({ children }: { children: ReactNode }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [currentConfidence, setCurrentConfidence] = useState(0);
    const [isDeepfake, setIsDeepfake] = useState(false);
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [history, setHistory] = useState<{ time: number, value: number, isDeepfake: boolean }[]>([]);
    const [detectionHistory, setDetectionHistory] = useState<StoredDetection[]>(loadStoredHistory);
    const [connectionState, setConnectionState] = useState<RTCIceConnectionState>('new');
    const [stats, setStats] = useState({ rtt: 0, packetsLost: 0, bytesReceived: 0 });
    const [currentSource, setCurrentSource] = useState<string>('default');
    const sessionStartTime = useRef<number>(Date.now());

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const stopRecordingRef = useRef<(() => void) | null>(null);

    const { addNotification } = useNotifications();
    const { stopSession, setRecording } = useSession();
    const historyStartTime = useRef(Date.now());

    // Save current session to history
    const saveCurrentSession = useCallback(() => {
        if (history.length === 0) return;

        // Calculate session summary
        const avgConfidence = history.reduce((sum, h) => sum + h.value, 0) / history.length;
        const hasDeepfake = history.some(h => h.isDeepfake);
        const duration = history.length > 0 ? history[history.length - 1].time : 0;

        const newSession: StoredDetection = {
            id: `det-${Date.now().toString(36)}`,
            timestamp: sessionStartTime.current,
            status: hasDeepfake ? 'deepfake' : avgConfidence >= 70 ? 'authentic' : 'uncertain',
            confidence: Math.round(avgConfidence),
            duration: Math.round(duration * 10) / 10,
            method: 'multi'
        };

        setDetectionHistory(prev => {
            const updated = [newSession, ...prev].slice(0, 100); // Keep last 100 sessions
            saveStoredHistory(updated);
            return updated;
        });
    }, [history]);

    // Clear all stored history
    const clearHistory = useCallback(() => {
        setDetectionHistory([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const stopRecording = useCallback(() => {
        // Save session before stopping
        if (history.length > 0) {
            saveCurrentSession();
        }

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

        // Close Audio Context and release Web Lock
        if (audioContextRef.current) {
            // Release the Web Lock
            const lockResolver = (audioContextRef.current as any)._lockResolver;
            if (lockResolver) {
                console.log("Releasing Web Lock");
                lockResolver();
            }
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setAudioContext(null);

        // Stop Stream Tracks
        if (audioStream) {
            // Also stop original display stream if it exists (for tab capture)
            const originalDisplayStream = (audioStream as any)._originalDisplayStream;
            if (originalDisplayStream) {
                console.log("Stopping original display stream");
                originalDisplayStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            }
            
            audioStream.getTracks().forEach(track => track.stop());
            setAudioStream(null);
        }

        // Clear current session history
        setHistory([]);

        stopSession(); // Update session state
    }, [audioStream, stopSession, history, saveCurrentSession]);

    // Keep ref updated for use in callbacks
    useEffect(() => {
        stopRecordingRef.current = stopRecording;
    }, [stopRecording]);

    // Handle visibility changes - keep audio running when tab loses focus
    useEffect(() => {
        const handleVisibilityChange = async () => {
            console.log("Visibility changed:", document.visibilityState);
            
            // CRITICAL: Resume AudioContext immediately when visible
            if (audioContextRef.current) {
                if (audioContextRef.current.state === 'suspended') {
                    console.log("Resuming AudioContext after visibility change");
                    try {
                        await audioContextRef.current.resume();
                        console.log("AudioContext resumed successfully, state:", audioContextRef.current.state);
                    } catch (e) {
                        console.error("Failed to resume AudioContext:", e);
                    }
                }
            }
            
            // Log WebRTC connection state for debugging
            if (pcRef.current) {
                const pc = pcRef.current;
                console.log("WebRTC state - connection:", pc.connectionState, 
                            "ICE:", pc.iceConnectionState,
                            "signaling:", pc.signalingState);
                
                // If connection is disconnected but not closed, it might recover
                if (pc.iceConnectionState === 'disconnected') {
                    console.log("Connection disconnected - waiting for recovery...");
                }
            }
            
            // Log audio track states
            if (audioStream) {
                audioStream.getAudioTracks().forEach(track => {
                    console.log(`Audio track "${track.label}": readyState=${track.readyState}, muted=${track.muted}, enabled=${track.enabled}`);
                    // Re-enable track if it got disabled
                    if (!track.enabled && track.readyState === 'live') {
                        console.log("Re-enabling track");
                        track.enabled = true;
                    }
                });
            }
        };

        // Also handle when page regains focus (not just visibility)
        const handleFocus = () => {
            console.log("Window regained focus");
            handleVisibilityChange();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [audioStream]);

    const startRecording = useCallback(async (deviceId: string = 'default') => {
        try {
            setConnectionState('checking');
            sessionStartTime.current = Date.now(); // Reset session start time
            setCurrentSource(deviceId);
            
            let stream: MediaStream;
            
            // 1. Get Audio based on source type
            if (deviceId === 'screen-share-audio') {
                // Tab/Screen Audio - Use getDisplayMedia with audio
                console.log("STEP 1: Requesting Tab/Screen Audio (Screen Share)...");
                try {
                    // Request display media with audio
                    // CRITICAL: Set surfaceSwitching to 'exclude' to prevent Chrome from switching tabs
                    const displayStream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            displaySurface: 'browser', // Prefer browser tab
                            width: { ideal: 1 },  // Minimal video to save resources
                            height: { ideal: 1 },
                            frameRate: { ideal: 1 }
                        } as any,
                        audio: {
                            echoCancellation: false,
                            noiseSuppression: false,
                            autoGainControl: false,
                            suppressLocalAudioPlayback: false // Don't mute the tab
                        } as any,
                        // @ts-ignore - Chrome specific options
                        preferCurrentTab: false,
                        selfBrowserSurface: 'include',
                        systemAudio: 'include',
                        // CRITICAL: These prevent Chrome from auto-switching to captured tab
                        surfaceSwitching: 'exclude',
                        monitorTypeSurfaces: 'exclude'
                    });
                    
                    // CRITICAL: Immediately return focus to our app
                    // This prevents Chrome from leaving us in background
                    window.focus();
                    
                    // Small delay to ensure we're back in focus
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Check if audio track exists
                    const audioTracks = displayStream.getAudioTracks();
                    const videoTracks = displayStream.getVideoTracks();
                    console.log("Audio tracks found:", audioTracks.length, audioTracks.map(t => t.label));
                    console.log("Video tracks found:", videoTracks.length);
                    
                    if (audioTracks.length === 0) {
                        // Stop all tracks and throw error
                        displayStream.getTracks().forEach(track => track.stop());
                        throw new Error('No audio captured. When sharing, make sure to:\n1. Select a Chrome TAB (not window/screen)\n2. Check "Share tab audio" checkbox at the bottom');
                    }
                    
                    // IMPORTANT: Keep the original stream with both audio and video
                    // Some browsers stop audio if video track is removed/stopped
                    // We just won't use the video track, but keep it alive
                    
                    // Clone the audio track to avoid issues when tab switches
                    // The clone maintains its own state separate from the original
                    const clonedAudioTrack = audioTracks[0].clone();
                    stream = new MediaStream([clonedAudioTrack]);
                    
                    // Keep original stream reference to stop later
                    (stream as any)._originalDisplayStream = displayStream;
                    
                    // Log track states for debugging
                    console.log("Track states after capture:");
                    console.log("  Original tracks:");
                    displayStream.getTracks().forEach(t => {
                        console.log(`    ${t.kind}: ${t.label} - readyState: ${t.readyState}, enabled: ${t.enabled}`);
                    });
                    console.log("  Cloned audio track:");
                    console.log(`    ${clonedAudioTrack.kind}: ${clonedAudioTrack.label} - readyState: ${clonedAudioTrack.readyState}, enabled: ${clonedAudioTrack.enabled}`);
                    
                    // Handle track ended event (user stops sharing)
                    const handleTrackEnded = () => {
                        console.log("Tab sharing track ended by user");
                        addNotification('info', 'Tab sharing stopped');
                        if (stopRecordingRef.current) {
                            stopRecordingRef.current();
                        }
                    };
                    
                    // Monitor both original and cloned track
                    audioTracks.forEach(track => {
                        track.onended = handleTrackEnded;
                        // Also monitor mute state
                        track.onmute = () => console.log("Original audio track muted:", track.label);
                        track.onunmute = () => console.log("Original audio track unmuted:", track.label);
                    });
                    videoTracks.forEach(track => {
                        track.onended = handleTrackEnded;
                    });
                    
                    // Monitor cloned track
                    clonedAudioTrack.onended = () => {
                        console.log("Cloned audio track ended");
                        handleTrackEnded();
                    };
                    clonedAudioTrack.onmute = () => console.log("Cloned audio track muted");
                    clonedAudioTrack.onunmute = () => console.log("Cloned audio track unmuted");
                    
                    console.log("STEP 1.1: Tab/Screen Audio Acquired", audioTracks[0]?.label);
                    addNotification('info', `Capturing audio from: ${audioTracks[0]?.label || 'Tab'}`);
                } catch (displayErr: any) {
                    console.error("Display media error:", displayErr);
                    if (displayErr.name === 'NotAllowedError') {
                        throw new Error('Screen sharing was cancelled.');
                    }
                    throw displayErr;
                }
            } else {
                // Regular audio input device (Microphone, Stereo Mix, Virtual Cable, etc.)
                console.log("STEP 1: Requesting Audio Device Access...", deviceId);
                const constraints: MediaStreamConstraints = {
                    audio: deviceId && deviceId !== 'default' 
                        ? { 
                            deviceId: { exact: deviceId },
                            echoCancellation: false,
                            noiseSuppression: false,
                            autoGainControl: false
                        }
                        : {
                            echoCancellation: false,
                            noiseSuppression: false,
                            autoGainControl: false
                        }
                };
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                const trackLabel = stream.getAudioTracks()[0]?.label || 'Unknown';
                console.log("STEP 1.1: Audio Device Acquired:", trackLabel);
                addNotification('info', `Using audio source: ${trackLabel}`);
            }
            
            // Verify we have audio tracks
            if (!stream || stream.getAudioTracks().length === 0) {
                throw new Error('No audio tracks available in stream');
            }
            
            console.log("Final stream tracks:", stream.getTracks().map(t => `${t.kind}: ${t.label}`));
            
            setAudioStream(stream);
            console.log("Audio Stream set:", stream.id);
            
            // 2. Setup Audio Context for Visualizer (Local only)
            // IMPORTANT: Connect stream to AudioContext to keep audio pipeline active
            // This prevents Chrome from throttling/suspending the audio when tab loses focus
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            
            // Create source from stream and connect to keep audio flowing
            const sourceNode = audioCtx.createMediaStreamSource(stream);
            const analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 256;
            sourceNode.connect(analyserNode);
            // Don't connect to destination (speakers) to avoid echo
            // Just having it connected to analyser keeps the audio active
            
            // Store analyser for potential visualizer use
            (audioCtx as any)._sourceNode = sourceNode;
            (audioCtx as any)._analyserNode = analyserNode;
            
            setAudioContext(audioCtx);
            console.log("AudioContext created and stream connected, state:", audioCtx.state);

            // CRITICAL: Acquire a Web Lock to prevent Chrome from throttling this tab
            // This keeps the tab "active" even when in background
            let lockResolver: (() => void) | null = null;
            const lockPromise = new Promise<void>(resolve => {
                lockResolver = resolve;
            });
            
            // Store resolver to release lock when stopping
            (audioCtx as any)._lockResolver = lockResolver;
            
            if (navigator.locks) {
                navigator.locks.request('audio-stream-lock', { mode: 'exclusive' }, async () => {
                    console.log("Web Lock acquired - tab will not be throttled");
                    // Hold the lock until recording stops
                    return lockPromise;
                }).catch(e => console.log("Web Lock not available:", e));
            }

            // 3. Setup WebRTC Peer Connection
            console.log("STEP 2: Creating RTCPeerConnection");
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
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

            // Add ONLY Audio Tracks to WebRTC (not video tracks from screen share)
            stream.getAudioTracks().forEach(track => {
                console.log("STEP 2.1: Adding Audio Track to PC:", track.kind, track.label, "readyState:", track.readyState);
                pc.addTrack(track, stream);
            });

            // Create Data Channel for Results
            const dc = pc.createDataChannel("results");
            dcRef.current = dc;
            console.log("STEP 3: Created Data Channel 'results'");

            dc.onopen = () => {
                console.log("STEP 5: WebRTC Data Channel OPEN");
                setIsConnected(true);
                setRecording(); // Update session status to 'recording'
                historyStartTime.current = Date.now();
                addNotification('info', 'Secured Audio Link Established (WebRTC)');
            };
            
            dc.onerror = (error) => {
                console.error("Data channel error:", error);
            };
            
            dc.onclose = () => {
                console.log("Data channel closed");
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

            // Stats Loop - also monitors track health and keeps audio active
            let lastBytesSent = 0;
            let stuckCounter = 0;
            
            const statsInterval = setInterval(async () => {
                // Ensure AudioContext is running (can get suspended in background)
                if (audioCtx.state === 'suspended') {
                    console.log("AudioContext suspended, resuming...");
                    try {
                        await audioCtx.resume();
                        console.log("AudioContext resumed");
                    } catch (e) {
                        console.error("Failed to resume AudioContext:", e);
                    }
                }
                
                // Check if audio tracks are still active
                const audioTracks = stream.getAudioTracks();
                const hasActiveTracks = audioTracks.some(t => t.readyState === 'live');
                
                // Log track states periodically
                audioTracks.forEach(t => {
                    console.log(`Track "${t.label}": readyState=${t.readyState}, muted=${t.muted}, enabled=${t.enabled}`);
                });
                
                if (!hasActiveTracks && pc.connectionState !== 'closed') {
                    console.warn("Audio tracks are no longer active!");
                    addNotification('warning', 'Audio source disconnected');
                    if (stopRecordingRef.current) {
                        stopRecordingRef.current();
                    }
                    return;
                }
                
                if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                    const report = await pc.getStats();
                    let newStats = { rtt: 0, packetsLost: 0, bytesReceived: 0 };
                    let currentBytesSent = 0;

                    report.forEach(stat => {
                        // Check outbound audio stats
                        if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
                            currentBytesSent = stat.bytesSent || 0;
                            console.log(`Audio RTP: bytesSent=${stat.bytesSent}, packetsSent=${stat.packetsSent}`);
                        }
                        if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                            newStats.rtt = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : 0;
                        }
                        if (stat.type === 'inbound-rtp') {
                            newStats.packetsLost += stat.packetsLost || 0;
                            newStats.bytesReceived += stat.bytesReceived || 0;
                        }
                    });
                    
                    // Detect if audio stopped flowing (bytes not increasing)
                    if (currentBytesSent > 0 && currentBytesSent === lastBytesSent) {
                        stuckCounter++;
                        console.warn(`Audio appears stuck (${stuckCounter}x) - no new bytes sent`);
                        if (stuckCounter >= 5) {
                            console.error("Audio stream appears to have stopped!");
                            addNotification('warning', 'Audio stream stalled - check tab sharing');
                        }
                    } else {
                        stuckCounter = 0;
                    }
                    lastBytesSent = currentBytesSent;
                    
                    setStats(newStats);
                }
            }, 2000); // Check every 2 seconds
            statsIntervalRef.current = statsInterval;

            pc.onconnectionstatechange = () => {
                console.log("Connection state changed:", pc.connectionState);
                if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
                    if (statsIntervalRef.current) {
                        clearInterval(statsIntervalRef.current);
                        statsIntervalRef.current = null;
                    }
                }
            };

            // Negotiate - Don't wait for full ICE gathering, use trickle ICE approach
            console.log("STEP 3.1: Creating Connection Offer...");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log("STEP 3.2: Local Description Set (Offer)");

            // Wait for at least one ICE candidate or timeout quickly
            // We'll use trickle ICE - send offer immediately, don't wait for full gathering
            await new Promise<void>(resolve => {
                if (pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    // Resolve after first candidate or short timeout
                    let resolved = false;
                    const resolveOnce = () => {
                        if (!resolved) {
                            resolved = true;
                            resolve();
                        }
                    };
                    
                    pc.onicecandidate = (event) => {
                        if (event.candidate) {
                            console.log("ICE candidate gathered:", event.candidate.type);
                        } else {
                            // null candidate means gathering complete
                            resolveOnce();
                        }
                    };
                    
                    // Short timeout - proceed with what we have
                    setTimeout(resolveOnce, 2000);
                }
            });
            console.log("STEP 3.2b: Proceeding with offer, ICE state:", pc.iceGatheringState);

            // Send Offer to Backend
            console.log("STEP 3.3: Sending Offer to Backend API...");
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
            console.log("API URL:", apiUrl);
            
            const response = await fetch(`${apiUrl}/webrtc/offer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sdp: pc.localDescription?.sdp,
                    type: pc.localDescription?.type
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Backend error (${response.status}): ${errorText}`);
            }

            const answer = await response.json();
            console.log("STEP 3.4: Received Answer from Backend");
            await pc.setRemoteDescription(answer);
            console.log("STEP 3.5: Remote Description Set (Answer)");

        } catch (err: any) {
            console.error("WebRTC Initialization failed", err);
            const errorMessage = err?.message || 'Could not start secure stream.';
            addNotification('error', `Connection Failed: ${errorMessage}`);
            // Clean up on error
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            if (dcRef.current) {
                dcRef.current.close();
                dcRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            setAudioContext(null);
            setAudioStream(null);
            setIsConnected(false);
            setConnectionState('failed');
            throw err; // Re-throw so the caller knows it failed
        }
    }, [addNotification, setRecording]);

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
        <DetectionContext.Provider value={{
            isConnected,
            currentConfidence,
            isDeepfake,
            history,
            detectionHistory,
            audioStream,
            audioContext,
            startRecording,
            stopRecording,
            connectionState,
            stats,
            saveCurrentSession,
            clearHistory,
            currentSource
        }}>
            {children}
        </DetectionContext.Provider>
    );
};

export const useDetection = () => {
    return useContext(DetectionContext);
};
