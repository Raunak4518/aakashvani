import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Wifi, Info, XCircle } from 'lucide-react';

export type NotificationType = 'deepfake' | 'quality' | 'network' | 'error' | 'info';

export interface AppNotification {
    id: string;
    type: NotificationType;
    message: string;
    timestamp: number;
    read: boolean;
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    addNotification: (type: NotificationType, message: string) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
    removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<AppNotification[]>(() => {
        const saved = localStorage.getItem('notifications');
        return saved ? JSON.parse(saved) : [
            // Initial Seed Data
            { id: '1', type: 'info', message: 'System updated to v2.4.0', timestamp: Date.now() - 3600000, read: false },
            { id: '2', type: 'network', message: 'High latency detected (150ms)', timestamp: Date.now() - 7200000, read: true }
        ];
    });

    useEffect(() => {
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }, [notifications]);

    // Clear old notifications (24h)
    useEffect(() => {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        setNotifications(prev => prev.filter(n => now - n.timestamp < oneDay));
    }, []);

    const addNotification = (type: NotificationType, message: string) => {
        const newNotif: AppNotification = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            message,
            timestamp: Date.now(),
            read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAll = () => setNotifications([]);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markAsRead,
            markAllAsRead,
            clearAll,
            removeNotification
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};

// Helper for Icons
export const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
        case 'deepfake': return <XCircle size={16} color="var(--accent-red)" />;
        case 'quality': return <AlertTriangle size={16} color="var(--accent-orange)" />;
        case 'network': return <Wifi size={16} color="#FFD700" />;
        case 'error': return <AlertTriangle size={16} color="var(--accent-red)" />;
        case 'info': return <Info size={16} color="var(--accent-cyan)" />;
        default: return <Info size={16} color="var(--text-secondary)" />;
    }
};
