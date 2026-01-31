import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioDevice {
    deviceId: string;
    label: string;
}

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [source, setSource] = useState<MediaStreamAudioSourceNode | null>(null);
    const [volume, setVolume] = useState(0.8); // 0.0 to 1.0
    const [devices, setDevices] = useState<AudioDevice[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
    const [error, setError] = useState<string | null>(null);

    // Refs for animation loop independence
    const rafId = useRef<number>();
    const analyserRef = useRef<AnalyserNode | null>(null);

    // Initialize Audio Context (lazy)
    const initAudioContext = useCallback(() => {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const anal = ctx.createAnalyser();
        anal.fftSize = 256; // Good balance for visualizer
        anal.smoothingTimeConstant = 0.8;

        setAudioContext(ctx);
        setAnalyser(anal);
        analyserRef.current = anal;

        return { ctx, anal };
    }, []);

    // Fetch Devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                const devs = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devs
                    .filter(d => d.kind === 'audioinput')
                    .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}...` }));
                setDevices(audioInputs);
            } catch (e) {
                console.warn("Could not enumerate devices", e);
            }
        };
        getDevices();
        navigator.mediaDevices.addEventListener('devicechange', getDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    }, []);

    const startRecording = async () => {
        setError(null);
        try {
            // 1. Init Audio Context if needed
            let ctx = audioContext;
            let anal = analyser;
            if (!ctx || !anal) {
                const init = initAudioContext();
                ctx = init.ctx;
                anal = init.anal;
            }

            if (ctx?.state === 'suspended') {
                await ctx.resume();
            }

            // 2. Get Stream
            const constraints = {
                audio: {
                    deviceId: selectedDeviceId !== 'default' ? { exact: selectedDeviceId } : undefined
                }
            };
            const newStream = await navigator.mediaDevices.getUserMedia(constraints);

            // 3. Connect Graph
            const src = ctx!.createMediaStreamSource(newStream);
            const gainNode = ctx!.createGain();

            gainNode.gain.value = volume;
            src.connect(gainNode);
            gainNode.connect(anal!);

            setStream(newStream);
            setSource(src);
            setPermissionGranted(true);
            setIsRecording(true);
            setIsPaused(false);

        } catch (err: any) {
            console.error("Error starting recording:", err);
            setError(err.message || "Could not access microphone");
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (source) {
            source.disconnect();
        }
        setIsRecording(false);
        setIsPaused(false);
        setStream(null);
        setSource(null);
        // We keep audioContext alive for reuse
    };

    const pauseRecording = () => {
        if (isRecording) {
            setIsPaused(true);
            audioContext?.suspend();
        }
    };

    const resumeRecording = () => {
        if (isRecording && isPaused) {
            setIsPaused(false);
            audioContext?.resume();
        }
    };

    // Helper to get data for visualizer
    const getFrequencyData = (dataArray: Uint8Array) => {
        if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
        }
    };

    return {
        isRecording,
        isPaused,
        permissionGranted,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        getFrequencyData,
        devices,
        selectedDeviceId,
        setSelectedDeviceId,
        volume,
        setVolume,
        error
    };
};
