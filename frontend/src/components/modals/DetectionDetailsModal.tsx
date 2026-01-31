import { Modal } from '../common/Modal';
import { AlertTriangle, Download, Flag } from 'lucide-react';

interface DetectionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data?: any;
}

export const DetectionDetailsModal = ({ isOpen, onClose }: DetectionDetailsModalProps) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detection Analysis"
            width="900px"
            height="auto" // auto height to fit content, but max-height is handled by Modal
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
                            <div className="text-mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>#SES-8921-XJ9</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>TIMESTAMP</div>
                            <div className="text-mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Oct 24, 14:32:05</div>
                        </div>
                    </div>

                    {/* Waveform Visualization */}
                    <div className="glass-panel" style={{ padding: 'var(--space-3)', position: 'relative', overflow: 'hidden' }}>
                        <h4 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>Waveform Analysis</h4>
                        <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', position: 'relative' }}>
                            {/* Fake Waveform Lines */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: '60%', width: '100%', padding: '0 10px' }}>
                                {Array.from({ length: 60 }).map((_, i) => (
                                    <div key={i} style={{
                                        flex: 1,
                                        height: `${20 + Math.random() * 80}%`,
                                        background: i > 35 && i < 45 ? 'var(--accent-red)' : 'var(--accent-cyan)',
                                        opacity: 0.8,
                                        borderRadius: 2
                                    }}></div>
                                ))}
                            </div>
                            {/* Anomaly Marker */}
                            <div style={{ position: 'absolute', left: '62%', top: 0, bottom: 0, borderLeft: '1px dashed var(--accent-red)' }}>
                                <div style={{ background: 'var(--accent-red)', color: 'white', fontSize: '10px', padding: '2px 4px', borderRadius: 2, position: 'absolute', top: 0, left: 4 }}>Anomaly Detected</div>
                            </div>
                        </div>
                    </div>

                    {/* Spectrogram Visualization */}
                    <div className="glass-panel" style={{ padding: 'var(--space-3)', flex: 1 }}>
                        <h4 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>Spectral Heatmap</h4>
                        <div style={{ height: '100%', minHeight: '150px', background: 'linear-gradient(180deg, #0a0e27 0%, #1a1f3a 100%)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                            {/* Fake Spectrogram CSS Pattern */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                opacity: 0.6,
                                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0,212,255,0.2) 0%, transparent 50%), repeating-linear-gradient(90deg, transparent 0, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 11px)'
                            }}></div>
                            <div style={{
                                position: 'absolute', top: '20%', left: '40%', width: '30%', height: '40%',
                                background: 'radial-gradient(ellipse at center, rgba(255,51,102,0.4) 0%, transparent 70%)',
                                filter: 'blur(8px)'
                            }}></div>
                        </div>
                    </div>

                </div>

                {/* Right Column: Analysis Data */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

                    {/* Verdict Card */}
                    <div className="glass-panel" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(255,51,102,0.1) 0%, rgba(255,51,102,0.2) 100%)', border: '1px solid rgba(255,51,102,0.3)' }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,51,102,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-2)',
                            boxShadow: '0 0 20px rgba(255,51,102,0.4)'
                        }}>
                            <AlertTriangle size={32} className="text-accent-red" />
                        </div>
                        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 4 }}>DEEPFAKE DETECTED</h2>
                        <div style={{ color: 'var(--accent-red)', fontWeight: 600, fontSize: 'var(--text-lg)' }}>98.2% Confidence</div>
                    </div>

                    {/* Features List */}
                    <div className="glass-panel" style={{ padding: 'var(--space-3)' }}>
                        <h4 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase' }}>Feature Analysis</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <FeatureRow label="Prosody Score" value={92} color="var(--accent-green)" />
                            <FeatureRow label="Spectral Consistency" value={34} color="var(--accent-red)" />
                            <FeatureRow label="Glottal Pulse" value={88} color="var(--accent-green)" />
                            <FeatureRow label="Phase Continuity" value={45} color="var(--accent-orange)" />
                        </div>
                    </div>

                    {/* Anomalies List */}
                    <div className="glass-panel" style={{ padding: 'var(--space-3)', flex: 1, overflowY: 'auto', minHeight: '100px' }}>
                        <h4 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase' }}>Detected Anomalies</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <AnomalyItem time="0:04.2" type="Unnatural Pitch" severity="High" />
                            <AnomalyItem time="0:07.8" type="Phase Vocoder Artifact" severity="Medium" />
                            <AnomalyItem time="0:12.1" type="Inconsistent Background" severity="Low" />
                        </div>
                    </div>

                    {/* Comparison to Reference */}
                    <div className="glass-panel" style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                            <h4 style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reference Comparison</h4>
                            <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>User Enrolled</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Similarity Score</div>
                                <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>94%</div>
                            </div>
                            <div style={{ height: 40, width: 1, background: 'rgba(255,255,255,0.1)' }}></div>
                            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                    <span>Voice Fingerprint</span>
                                    <span style={{ color: 'var(--accent-green)' }}>Match</span>
                                </div>
                                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                                    <div style={{ width: '94%', height: '100%', background: 'var(--accent-cyan)', borderRadius: 2 }}></div>
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
