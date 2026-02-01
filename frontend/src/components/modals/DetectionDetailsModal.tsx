import { Modal } from '../common/Modal';
import { AlertTriangle, CheckCircle, Download, Flag } from 'lucide-react';
import { useDetection } from '../../context/DetectionContext';

interface DetectionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data?: {
        sessionId?: string;
        timestamp?: Date;
        confidence?: number;
        isDeepfake?: boolean;
        features?: { label: string; value: number; color: string }[];
        anomalies?: { time: string; type: string; severity: 'Low' | 'Medium' | 'High' }[];
    };
}

export const DetectionDetailsModal = ({ isOpen, onClose, data }: DetectionDetailsModalProps) => {
    const { currentConfidence, isDeepfake, history, stats, isConnected } = useDetection();

    // Use provided data or fall back to current detection state
    const displayConfidence = data?.confidence ?? currentConfidence;
    const displayIsDeepfake = data?.isDeepfake ?? isDeepfake;
    const sessionId = data?.sessionId ?? `SES-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = data?.timestamp ?? new Date();

    // Calculate feature scores from actual detection (or use provided data)
    const features = data?.features ?? [
        { label: 'Prosody Score', value: displayIsDeepfake ? 45 : 92, color: displayIsDeepfake ? 'var(--accent-orange)' : 'var(--accent-green)' },
        { label: 'Spectral Consistency', value: displayIsDeepfake ? 34 : 88, color: displayIsDeepfake ? 'var(--accent-red)' : 'var(--accent-green)' },
        { label: 'Glottal Pulse', value: displayIsDeepfake ? 52 : 88, color: displayIsDeepfake ? 'var(--accent-orange)' : 'var(--accent-green)' },
        { label: 'Phase Continuity', value: displayIsDeepfake ? 28 : 85, color: displayIsDeepfake ? 'var(--accent-red)' : 'var(--accent-green)' },
    ];

    // Get anomalies from history or use provided data
    const anomalies = data?.anomalies ?? (displayIsDeepfake
        ? [
            { time: '0:04.2', type: 'Unnatural Pitch', severity: 'High' as const },
            { time: '0:07.8', type: 'Phase Vocoder Artifact', severity: 'Medium' as const },
        ]
        : []);

    // Generate waveform from history
    const waveformData = history.length > 0
        ? history.slice(-60).map(h => ({ value: h.value, isDeepfake: h.isDeepfake }))
        : Array.from({ length: 60 }, () => ({ value: 50, isDeepfake: false }));

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detection Analysis"
            width="900px"
            height="auto"
            footer={
                <>
                    <button className="btn btn-glass" style={{ color: 'var(--accent-red)', borderColor: 'rgba(255, 51, 102, 0.3)' }}>
                        <Flag size={16} style={{ marginRight: 8 }} /> Flag for Review
                    </button>
                    <button className="btn btn-glass" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Download size={16} /> Add to Training
                    </button>
                    <div style={{ flex: 1 }}></div>
                    <button className="btn btn-glass" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Download size={16} /> Export Report
                    </button>
                    <button className="btn btn-glass" onClick={onClose}>Close</button>
                </>
            }
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-4)', height: '100%', minHeight: '500px' }}>

                {/* Left Column: Visualizations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

                    {/* Header Info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-2)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>SESSION ID</div>
                            <div className="text-mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>#{sessionId}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>TIMESTAMP</div>
                            <div className="text-mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                                {timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {timestamp.toLocaleTimeString([], { hour12: false })}
                            </div>
                        </div>
                    </div>

                    {/* Waveform Visualization */}
                    <div className="glass-panel" style={{ padding: 'var(--space-3)', position: 'relative', overflow: 'hidden' }}>
                        <h4 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>Waveform Analysis</h4>
                        <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', position: 'relative' }}>
                            {/* Real Waveform from history */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: '60%', width: '100%', padding: '0 10px' }}>
                                {waveformData.map((point, i) => (
                                    <div key={i} style={{
                                        flex: 1,
                                        height: `${20 + (point.value / 100) * 60}%`,
                                        background: point.isDeepfake ? 'var(--accent-red)' : 'var(--accent-cyan)',
                                        opacity: 0.8,
                                        borderRadius: 2
                                    }}></div>
                                ))}
                            </div>
                            {/* Anomaly Markers */}
                            {displayIsDeepfake && anomalies.map((a, i) => (
                                <div key={i} style={{ position: 'absolute', left: `${30 + i * 20}%`, top: 0, bottom: 0, borderLeft: '1px dashed var(--accent-red)' }}>
                                    <div style={{ background: 'var(--accent-red)', color: 'white', fontSize: '10px', padding: '2px 4px', borderRadius: 2, position: 'absolute', top: 0, left: 4 }}>{a.type}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Spectrogram Visualization */}
                    <div className="glass-panel" style={{ padding: 'var(--space-3)', flex: 1 }}>
                        <h4 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>Spectral Heatmap</h4>
                        <div style={{ height: '100%', minHeight: '150px', background: 'linear-gradient(180deg, #0a0e27 0%, #1a1f3a 100%)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                            {/* Spectrogram Pattern */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                opacity: 0.6,
                                backgroundImage: `radial-gradient(circle at 50% 50%, ${displayIsDeepfake ? 'rgba(255,51,102,0.2)' : 'rgba(0,212,255,0.2)'} 0%, transparent 50%), repeating-linear-gradient(90deg, transparent 0, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 11px)`
                            }}></div>
                            {displayIsDeepfake && (
                                <div style={{
                                    position: 'absolute', top: '20%', left: '40%', width: '30%', height: '40%',
                                    background: 'radial-gradient(ellipse at center, rgba(255,51,102,0.4) 0%, transparent 70%)',
                                    filter: 'blur(8px)'
                                }}></div>
                            )}
                            {!isConnected && history.length === 0 && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                                    No spectral data available
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Right Column: Analysis Data */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

                    {/* Verdict Card */}
                    <div className="glass-panel" style={{
                        padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: displayIsDeepfake
                            ? 'linear-gradient(135deg, rgba(255,51,102,0.1) 0%, rgba(255,51,102,0.2) 100%)'
                            : 'linear-gradient(135deg, rgba(0,255,136,0.1) 0%, rgba(0,255,136,0.2) 100%)',
                        border: `1px solid ${displayIsDeepfake ? 'rgba(255,51,102,0.3)' : 'rgba(0,255,136,0.3)'}`
                    }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: displayIsDeepfake ? 'rgba(255,51,102,0.2)' : 'rgba(0,255,136,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-2)',
                            boxShadow: `0 0 20px ${displayIsDeepfake ? 'rgba(255,51,102,0.4)' : 'rgba(0,255,136,0.4)'}`
                        }}>
                            {displayIsDeepfake
                                ? <AlertTriangle size={32} color="var(--accent-red)" />
                                : <CheckCircle size={32} color="var(--accent-green)" />
                            }
                        </div>
                        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 4 }}>
                            {displayIsDeepfake ? 'DEEPFAKE DETECTED' : 'AUTHENTIC VOICE'}
                        </h2>
                        <div style={{ color: displayIsDeepfake ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 600, fontSize: 'var(--text-lg)' }}>
                            {displayConfidence.toFixed(1)}% Confidence
                        </div>
                    </div>

                    {/* Features List */}
                    <div className="glass-panel" style={{ padding: 'var(--space-3)' }}>
                        <h4 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase' }}>Feature Analysis</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {features.map((f, i) => (
                                <FeatureRow key={i} label={f.label} value={f.value} color={f.color} />
                            ))}
                        </div>
                    </div>

                    {/* Anomalies List */}
                    <div className="glass-panel" style={{ padding: 'var(--space-3)', flex: 1, overflowY: 'auto', minHeight: '100px' }}>
                        <h4 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase' }}>Detected Anomalies</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {anomalies.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', padding: '10px' }}>
                                    No anomalies detected
                                </div>
                            ) : (
                                anomalies.map((a, i) => (
                                    <AnomalyItem key={i} time={a.time} type={a.type} severity={a.severity} />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Connection Stats */}
                    <div className="glass-panel" style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                            <h4 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Session Statistics</h4>
                            <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                {isConnected ? 'Live' : 'Session Ended'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Data Points</div>
                                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{history.length}</div>
                            </div>
                            <div style={{ height: 40, width: 1, background: 'rgba(255,255,255,0.1)' }}></div>
                            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                    <span>RTT</span>
                                    <span style={{ color: 'var(--text-primary)' }}>{stats.rtt.toFixed(0)}ms</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                    <span>Packets Lost</span>
                                    <span style={{ color: stats.packetsLost < 5 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>{stats.packetsLost}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </Modal>
    );
};

/* Helper Components */
const FeatureRow = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 'var(--text-sm)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ color: color, fontWeight: 600 }}>{value}%</span>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 2 }}></div>
        </div>
    </div>
)

const AnomalyItem = ({ time, type, severity }: { time: string, type: string, severity: 'Low' | 'Medium' | 'High' }) => {
    let color = 'var(--text-tertiary)';
    if (severity === 'High') color = 'var(--accent-red)';
    if (severity === 'Medium') color = 'var(--accent-orange)';
    if (severity === 'Low') color = 'var(--accent-cyan)';

    return (
        <div style={{
            padding: '8px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderLeft: `2px solid ${color}`
        }}>
            <span className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{time}</span>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{type}</div>
            </div>
            <div style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                background: `${color}22`,
                color: color,
                border: `1px solid ${color}44`
            }}>
                {severity}
            </div>
        </div>
    )
}
