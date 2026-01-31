import { Zap, CheckCircle, Activity, BarChart2 } from 'lucide-react';

export const LiveMetricsDashboard = () => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            {/* Confidence */}
            <div className="glass-panel" style={{ padding: 'var(--space-2)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Current Confidence</div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--accent-green)', margin: '4px 0' }}>87%</div>
                <div style={{ fontSize: '10px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <Zap size={10} /> +3% trend
                </div>
            </div>

            {/* Latency */}
            <div className="glass-panel" style={{ padding: 'var(--space-2)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Processing Latency</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--text-primary)' }}>142<span style={{ fontSize: '12px' }}>ms</span></div>
                <div style={{ fontSize: '10px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <CheckCircle size={10} /> Good
                </div>
            </div>

            {/* Audio Quality */}
            <div className="glass-panel" style={{ padding: 'var(--space-2)', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid var(--accent-cyan)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>8.4</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>Input Quality</div>
            </div>

            {/* Samples */}
            <div className="glass-panel" style={{ padding: 'var(--space-2)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold' }}>247</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Samples</div>
                <div style={{ height: 4, width: '80%', background: 'rgba(255,255,255,0.1)', margin: '4px auto', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: '60%', background: 'var(--accent-cyan)' }}></div>
                </div>
            </div>
        </div>
    );
};
