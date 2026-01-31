import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export const useWebRTC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const [status, setStatus] = useState<string>('idle');

    const startConnection = async () => {
        setStatus('connecting');
        try {
            // 1. Get User Media (Audio)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // 2. Create RTCPeerConnection
            const pc = new RTCPeerConnection();
            peerConnection.current = pc;

            // 3. Add Tracks
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            // 4. Create Data Channel (optional but good for bi-directional status)
            const dc = pc.createDataChannel("chat");
            dc.onopen = () => console.log("Data Channel Opened");
            dc.onmessage = (event) => console.log("Data Channel Message:", event.data);

            // 5. Create Offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // 6. Send Offer to Backend
            const response = await axios.post('http://localhost:8000/api/v1/webrtc/offer', {
                sdp: pc.localDescription?.sdp,
                type: pc.localDescription?.type
            });

            // 7. Handle Answer
            const answer = response.data;
            await pc.setRemoteDescription(answer);

            setIsConnected(true);
            setStatus('connected');
            console.log("WebRTC Connection Established");

        } catch (error) {
            console.error("WebRTC Connection Failed:", error);
            setStatus('failed');
            setIsConnected(false);
        }
    };

    const stopConnection = () => {
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setIsConnected(false);
        setStatus('idle');
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (peerConnection.current) {
                peerConnection.current.close();
            }
        };
    }, []);

    return {
        isConnected,
        status,
        startConnection,
        stopConnection
    };
};
