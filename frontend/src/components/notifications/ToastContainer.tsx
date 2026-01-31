import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';
import type { Alert, AlertType } from '../../context/AlertContext';

export const ToastContainer = () => {
    const { alerts, removeAlert } = useAlert();

    return (
        <div style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            pointerEvents: 'none' // Allow clicks through container
        }}>
            {alerts.map((alert) => (
                <Toast key={alert.id} alert={alert} onClose={() => removeAlert(alert.id)} />
            ))}
        </div>
    );
};

const Toast = ({ alert, onClose }: { alert: Alert, onClose: () => void }) => {
    const getIcon = (type: AlertType) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="text-accent-green" />;
            case 'warning': return <AlertTriangle size={20} className="text-accent-orange" />;
            case 'error': return <AlertCircle size={20} className="text-accent-red" />;
            case 'info': return <Info size={20} className="text-accent-cyan" />;
        }
    };

    const getBorderColor = (type: AlertType) => {
        switch (type) {
            case 'success': return 'var(--accent-green)';
            case 'warning': return 'var(--accent-orange)';
            case 'error': return 'var(--accent-red)';
            case 'info': return 'var(--accent-cyan)';
        }
    };

    return (
        <div style={{
            width: 320,
            background: 'rgba(10, 14, 39, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderLeft: `3px solid ${getBorderColor(alert.type)}`,
            borderRadius: '4px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'start',
            gap: 12,
            pointerEvents: 'auto',
            animation: 'slideInRight 0.3s ease-out',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Progress Bar */}
            {alert.duration !== 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: 2,
                    background: getBorderColor(alert.type),
                    width: '100%',
                    animation: `progress ${alert.duration || 4000}ms linear forwards`
                }}></div>
            )}

            <div style={{ marginTop: 2 }}>{getIcon(alert.type)}</div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>{alert.message}</div>
                {alert.subMessage && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>{alert.subMessage}</div>
                )}
            </div>
            <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
            >
                <X size={16} />
            </button>
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes progress {
                    from { transform: scaleX(1); transform-origin: left; }
                    to { transform: scaleX(0); transform-origin: left; }
                }
            `}</style>
        </div>
    );
};
