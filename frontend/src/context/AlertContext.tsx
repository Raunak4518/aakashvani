import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export type AlertType = 'success' | 'warning' | 'error' | 'info';

export interface Alert {
    id: string;
    type: AlertType;
    message: string;
    subMessage?: string; // Optional detail
    duration?: number;
}

interface AlertContextType {
    alerts: Alert[];
    addAlert: (alert: Omit<Alert, 'id'>) => void;
    removeAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [alerts, setAlerts] = useState<Alert[]>([]);

    const addAlert = useCallback((alert: Omit<Alert, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newAlert = { ...alert, duration: alert.duration !== undefined ? alert.duration : 4000, id }; // Default 4s

        setAlerts((prev) => [...prev, newAlert]);

        // Sound Simulation (Native AudioContext - brief beep)
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                // Frequency based on type
                if (alert.type === 'error') osc.frequency.value = 150; // Low buzz
                else if (alert.type === 'success') osc.frequency.value = 880; // High ping
                else osc.frequency.value = 440; // Mid beep

                osc.type = alert.type === 'error' ? 'sawtooth' : 'sine';

                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch (e) {
            console.error("Audio playback failed", e);
        }

        if (newAlert.duration !== 0) {
            setTimeout(() => {
                removeAlert(id);
            }, newAlert.duration);
        }
    }, []);

    const removeAlert = useCallback((id: string) => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, []);

    return (
        <AlertContext.Provider value={{ alerts, addAlert, removeAlert }}>
            {children}
        </AlertContext.Provider>
    );
};

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (context === undefined) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};
