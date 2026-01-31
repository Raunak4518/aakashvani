import { X, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

interface NetworkWarningProps {
    isVisible?: boolean; // Can be controlled externally
    onDismiss?: () => void;
}

export const NetworkWarning = ({ isVisible = false, onDismiss }: NetworkWarningProps) => {
    const [visible, setVisible] = useState(isVisible);
    const [stats, setStats] = useState({ packetLoss: 8.3, jitter: 52 });

    useEffect(() => {
        setVisible(isVisible);
    }, [isVisible]);

    useEffect(() => {
        // Simulate fluctuating network stats
        const interval = setInterval(() => {
            setStats(prev => ({
                packetLoss: Math.max(0, prev.packetLoss + (Math.random() - 0.5) * 2),
                jitter: Math.max(10, Math.floor(prev.jitter + (Math.random() - 0.5) * 10))
            }));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '60px',
            background: 'rgba(255, 51, 102, 0.15)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 51, 102, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.2)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', maxWidth: '1200px', width: '100%', padding: '0 var(--space-4)' }}>
                {/* Icon & Main Message */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'rgba(255, 51, 102, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'pulse 2s infinite'
                    }}>
                        <WifiOff size={18} className="text-accent-red" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Poor network quality detected</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Detection accuracy may be reduced due to signal instability.</div>
                    </div>
                </div>

                {/* Tech Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginLeft: 'auto', marginRight: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Packet Loss</span>
                        <span className="text-mono" style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{stats.packetLoss.toFixed(1)}%</span>
                    </div>
                    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Jitter</span>
                        <span className="text-mono" style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>{stats.jitter}ms</span>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                    <button className="btn btn-glass" style={{ height: 32, fontSize: '12px', padding: '0 12px' }}>
                        View Details
                    </button>
                    <button
                        onClick={() => {
                            setVisible(false);
                            onDismiss?.();
                        }}
                        style={{
                            background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: '50%',
                            transition: 'background 0.2s'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
                @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 51, 102, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(255, 51, 102, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 51, 102, 0); } }
            `}</style>
        </div>
    );
};
