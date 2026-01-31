import { Shield, CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';

interface DetectionStatusCardProps {
    status: 'authentic' | 'analyzing' | 'deepfake' | 'uncertain' | 'idle';
    confidence: number; // 0-100
    latency: number;
}

export const DetectionStatusCard = ({ status, confidence, latency }: DetectionStatusCardProps) => {
    // Config based on status
    const config = {
        idle: { color: 'var(--text-secondary)', text: 'READY TO SCAN', icon: Shield },
        authentic: { color: 'var(--accent-green)', text: 'AUTHENTIC VOICE', icon: CheckCircle },
        analyzing: { color: 'var(--accent-orange)', text: 'ANALYZING...', icon: Activity },
        deepfake: { color: 'var(--accent-red)', text: 'DEEPFAKE DETECTED', icon: XCircle },
        uncertain: { color: '#fbbf24', text: 'UNCERTAIN', icon: AlertTriangle }
    };

    const current = config[status] || config.idle;
    const Icon = current.icon;

    return (
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            {/* Main Status */}
            <div className="glass-panel" style={{ flex: 2, padding: '24px', display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', overflow: 'hidden' }}>
                {/* Background Glow */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '200px', background: current.color, opacity: 0.1, filter: 'blur(60px)', borderRadius: '50%' }}></div>

                {/* Big Icon */}
                <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: `rgba(0,0,0,0.2)`,
                    border: `2px solid ${status === 'analyzing' ? 'transparent' : current.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 20px ${current.color}40`,
                    animation: status === 'analyzing' ? 'spin 3s linear infinite' : 'none'
                }}>
                    <Icon size={36} color={current.color} className={status === 'deepfake' || status === 'authentic' ? 'animate-pulse' : ''} />
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: 2, textTransform: 'uppercase' }}>Verdict</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: current.color, letterSpacing: 1 }}>{current.text}</div>

                    {/* Confidence Meter */}
                    <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Confidence Score</span>
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{confidence}%</span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                                width: `${confidence}%`,
                                height: '100%',
                                background: current.color,
                                transition: 'width 0.5s ease-out'
                            }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Metrics */}
            <div className="glass-panel" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
                <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 4 }}>Analysis Method</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: 4, background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe' }}>Spectral</span>
                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: 4, background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd' }}>Neural</span>
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 4 }}>Latency</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{latency}ms</span>
                        <span style={{ fontSize: '12px', color: latency < 200 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                            {latency < 200 ? 'Excellent' : 'Fair'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
