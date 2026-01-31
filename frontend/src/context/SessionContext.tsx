import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type SessionStatus = 'idle' | 'recording' | 'paused';

interface SessionContextType {
    status: SessionStatus;
    startTime: number | null;
    duration: number; // in seconds
    sessionId: string;
    startSession: () => void;
    pauseSession: () => void;
    stopSession: () => void;
    formatTime: (seconds: number) => string;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
    const [status, setStatus] = useState<SessionStatus>('recording'); // Default to recording for demo
    const [startTime, setStartTime] = useState<number | null>(Date.now());
    const [duration, setDuration] = useState(0);
    const [sessionId] = useState(`SES-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (status === 'recording' && startTime) {
            // Update duration every second based on elapsed time
            // In a real app, this might accumulate segments. For now, simple diff.
            interval = setInterval(() => {
                setDuration(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [status, startTime]);

    const startSession = () => {
        if (status === 'idle') {
            setStartTime(Date.now());
            setDuration(0);
        }
        setStatus('recording');
    };

    const pauseSession = () => setStatus('paused');

    const stopSession = () => {
        setStatus('idle');
        setStartTime(null);
        setDuration(0);
    };

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    return (
        <SessionContext.Provider value={{
            status,
            startTime,
            duration,
            sessionId,
            startSession,
            pauseSession,
            stopSession,
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
