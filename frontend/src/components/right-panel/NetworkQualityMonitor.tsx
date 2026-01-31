import { Wifi, Signal } from 'lucide-react';

export const NetworkQualityMonitor = () => {
    return (
        <div className="glass-panel" style={{ padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Wifi size={16} />
                    <span style={{ fontWeight: 600 }}>Network Quality</span>
                </div>
                <Signal size={16} color="var(--accent-green)" />
            </div>

            {/* Bandwidth Chart (SVG) */}
            <div style={{ height: 60, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--space-2)', marginBottom: 'var(--space-2)', position: 'relative', overflow: 'hidden' }}>
                <svg width="100%" height="100%" preserveAspectRatio="none">
                    <path d="M0,50 Q20,20 40,40 T80,30 T120,45 T160,20 T200,40 T240,30 V60 H0 Z" fill="rgba(0, 212, 255, 0.2)" stroke="var(--accent-cyan)" strokeWidth="2" />
                </svg>
                <div style={{ position: 'absolute', top: 4, right: 4, fontSize: '10px', color: 'var(--accent-cyan)' }}>64 kbps</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Packet Loss</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-green)' }}>0.2% (Excellent)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Jitter</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>8ms</span>
            </div>
        </div>
    );
};
