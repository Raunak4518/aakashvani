import { useState, useEffect } from 'react';
import { Wifi, X, ChevronRight } from 'lucide-react';
import { useDetection } from '../../context/DetectionContext';

interface NetworkWarningProps {
    onDismiss?: () => void;
    onShowDetails?: () => void;
}

export const NetworkWarning = ({ onDismiss, onShowDetails }: NetworkWarningProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const { stats, connectionState, isConnected } = useDetection();

    // Show warning when network quality is poor
    useEffect(() => {
        if (!isConnected) {
            setIsVisible(false);
            return;
        }

        // Show warning if packet loss is high or RTT is high
        const shouldShow = stats.packetsLost > 20 || stats.rtt > 200 || connectionState === 'disconnected' || connectionState === 'failed';
        setIsVisible(shouldShow);
    }, [stats, connectionState, isConnected]);

    const handleDismiss = () => {
        setIsVisible(false);
        onDismiss?.();
    };

    if (!isVisible) return null;

    return (
        <div className="animate-slide-in" style={{
            position: 'fixed',
            top: 'var(--space-4)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'linear-gradient(135deg, rgba(255, 136, 0, 0.2) 0%, rgba(255, 136, 0, 0.1) 100%)',
            border: '1px solid rgba(255, 136, 0, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(255, 136, 0, 0.2)'
        }}>
            {/* Icon */}
            <div style={{
                width: 40, height: 40,
                borderRadius: '50%',
                background: 'rgba(255, 136, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Wifi size={20} color="var(--accent-orange)" />
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2, color: 'var(--accent-orange)' }}>Poor Network Quality Detected</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', gap: 'var(--space-4)' }}>
                    <span>Packet Loss: <strong style={{ color: 'var(--accent-orange)' }}>{stats.packetsLost} pkts</strong></span>
                    <span>RTT: <strong style={{ color: 'var(--text-primary)' }}>{stats.rtt.toFixed(0)}ms</strong></span>
                </div>
            </div>

            {/* Actions */}
            <button
                onClick={onShowDetails}
                className="btn btn-glass"
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderColor: 'rgba(255, 136, 0, 0.3)' }}
            >
                View Details <ChevronRight size={14} />
            </button>
            <button
                onClick={handleDismiss}
                style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                <X size={14} color="var(--text-secondary)" />
            </button>

            <style>{`
                @keyframes slide-in {
                    from { 
                        opacity: 0; 
                        transform: translateX(-50%) translateY(-20px); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateX(-50%) translateY(0); 
                    }
                }
                .animate-slide-in { animation: slide-in 0.3s ease-out; }
            `}</style>
        </div>
    );
};
