import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export type SessionStatus = 'idle' | 'connecting' | 'recording' | 'paused' | 'error';

interface SessionContextType {
    status: SessionStatus;
    startTime: number | null;
    duration: number;
    sessionId: string;
    errorMessage: string | null;
    startSession: () => Promise<void>;
    pauseSession: () => void;
    stopSession: () => void;
    setRecording: () => void;
    setSessionError: (message: string) => void;
    formatTime: (seconds: number) => string;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState<SessionStatus>('idle');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [duration, setDuration] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [sessionId] = useState(`SES-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        if (status === 'recording' && startTime) {
            interval = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [status, startTime]);

    const startSession = useCallback(async () => {
        if (status === 'idle' || status === 'paused' || status === 'error') {
            setStatus('connecting');
            setErrorMessage(null);
            setStartTime(Date.now());
            setDuration(0);
        }
    }, [status]);

    const pauseSession = useCallback(() => setStatus('paused'), []);

    const setRecording = useCallback(() => {
        setStatus('recording');
        setStartTime(Date.now());
    }, []);

    const stopSession = useCallback(() => {
        setStatus('idle');
        setStartTime(null);
        setDuration(0);
        setErrorMessage(null);
    }, []);

    const setSessionError = useCallback((message: string) => {
        setStatus('error');
        setErrorMessage(message);
        setStartTime(null);
        setDuration(0);
        // Auto-clear error after 3 seconds
        setTimeout(() => {
            setStatus('idle');
            setErrorMessage(null);
        }, 3000);
    }, []);

    const formatTime = useCallback((totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');
        return hours > 0
            ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
            : `${pad(minutes)}:${pad(seconds)}`;
    }, []);

    return (
        <SessionContext.Provider value={{
            status,
            startTime,
            duration,
            sessionId,
            errorMessage,
            startSession,
            pauseSession,
            stopSession,
            setRecording,
            setSessionError,
            formatTime
        }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) throw new Error('useSession must be used within SessionProvider');
    return context;
};
