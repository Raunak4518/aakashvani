import { useState } from 'react';
import { Mic, Play, Square, RefreshCw, ShieldCheck, ChevronDown, Volume2, Activity, Bell } from 'lucide-react';
import { SpectrogramViewer } from './specialized/SpectrogramViewer';
import { ConfidenceTimeline } from './specialized/ConfidenceTimeline';
import { useAlert } from '../context/AlertContext';
import { useSession } from '../context/SessionContext';
import { useDetection } from '../context/DetectionContext';

export const MainWorkspace = () => {
    const [showSpectrogram, setShowSpectrogram] = useState(false);
    const { addAlert } = useAlert();
    const { startSession, stopSession, status } = useSession();
    const { startRecording, stopRecording, isConnected, isDeepfake, currentConfidence, connectionState, stats } = useDetection();

    const triggerDemoAlerts = () => {
        addAlert({ type: 'info', message: 'Sample processed', subMessage: 'Analysis complete in 120ms' });
        setTimeout(() => addAlert({ type: 'success', message: 'Voice Authenticated', subMessage: 'Confidence > 98%' }), 1000);
        setTimeout(() => addAlert({ type: 'warning', message: 'Network Jitter Detected', subMessage: 'Latency increased to 150ms' }), 3000);
        setTimeout(() => addAlert({ type: 'error', message: 'Deepfake Pattern Detected', subMessage: 'Neural vocoder artifacts found' }), 5000);
    };

    const handleToggleRecording = async () => {
        if (status === 'recording') {
            stopSession();
            stopRecording();
        } else {
            await startSession();
            await startRecording();
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* Header / Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        className={`btn btn-glass ${showSpectrogram ? 'active' : ''}`}
                        onClick={() => setShowSpectrogram(!showSpectrogram)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, borderColor: showSpectrogram ? 'var(--accent-cyan)' : undefined }}
                    >
                        <Activity size={16} /> {showSpectrogram ? 'Hide Spectrogram' : 'Show Spectrogram'}
                    </button>
                    <button className="btn btn-glass" onClick={triggerDemoAlerts} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bell size={16} /> Test Alerts
                    </button>
                </div>
            </div>

            {/* Spectrogram (Collapsed by default) */}
            {showSpectrogram && (
                <div style={{ animation: 'slideInDown 0.3s ease-out' }}>
                    <SpectrogramViewer height={200} />
                </div>
            )}

            {/* Live Waveform Visualizer */}
            <div className="glass-panel" style={{
                flex: 1,
                minHeight: '280px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                padding: '24px',
                justifyContent: 'flex-end',
                overflow: 'hidden'
            }}>
                {/* Overlay Info */}
                <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, background: isConnected ? 'var(--accent-green)' : 'var(--accent-red)', borderRadius: '50%', boxShadow: `0 0 8px ${isConnected ? 'var(--accent-green)' : 'var(--accent-red)'}`, animation: 'pulse 1s infinite' }}></div>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, letterSpacing: 1 }}>{isConnected ? 'LIVE WEBRTC LINK' : 'READY TO ANALYZE'}</span>
                    </div>

                    {/* Connection Stats Overlay */}
                    {isConnected && (
                        <div style={{ marginTop: 8, fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                            <div>STATE: <span style={{ color: connectionState === 'connected' ? 'var(--accent-green)' : 'var(--accent-orange)' }}>{connectionState.toUpperCase()}</span></div>
                            <div>RTT: {stats.rtt.toFixed(0)}ms</div>
                            <div>LOSS: {stats.packetsLost} pkts</div>
                            <div>RX: {(stats.bytesReceived / 1024).toFixed(1)} KB</div>
                        </div>
                    )}
                </div>

                {/* Grid Lines */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', top: '25%', width: '100%', height: 1, background: 'rgba(255,255,255,0.05)' }}></div>
                    <div style={{ position: 'absolute', top: '50%', width: '100%', height: 1, background: 'rgba(255,255,255,0.05)' }}></div>
                    <div style={{ position: 'absolute', top: '75%', width: '100%', height: 1, background: 'rgba(255,255,255,0.05)' }}></div>
                </div>

                {/* Waveform Bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60%', width: '100%', justifyContent: 'center' }}>
                    {Array.from({ length: 60 }).map((_, i) => {
                        const height = Math.random() * 80 + 10;
                        // Color logic based on "mock" suspicion
                        let color = 'var(--accent-green)';
                        if (i > 40 && i < 50) color = 'var(--accent-red)'; // Suspicious segment
                        else if (i > 20 && i < 30) color = 'var(--accent-orange)'; // Analyzing

                        return (
                            <div key={i} style={{
                                flex: 1,
                                height: `${isConnected ? height : 5}%`, // Active bars only if connected
                                background: `linear-gradient(to top, ${color}, transparent)`,
                                borderRadius: 2,
                                opacity: 0.8,
                                transition: 'height 0.1s ease'
                            }}></div>
                        )
                    })}
                </div>

                {/* Time Markers */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="text-mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>00:00</span>
                    <span className="text-mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>00:03</span>
                    <span className="text-mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>00:06</span>
                    <span className="text-mono" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>00:10</span>
                </div>
            </div>

            {/* Confidence Timeline */}
            <ConfidenceTimeline />

            {/* Audio Control Panel */}
            <div className="glass-panel" style={{ padding: 'var(--space-4)', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 'var(--space-4)' }}>

                {/* Input Source */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="glass-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderRadius: 20 }}>
                        <Mic size={16} />
                        <span style={{ fontSize: 'var(--text-sm)' }}>System Default</span>
                        <ChevronDown size={14} />
                    </div>
                </div>

                {/* Playback Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
                    <button className="btn btn-glass" style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={20} fill="white" style={{ marginLeft: 2 }} />
                    </button>

                    <button
                        onClick={handleToggleRecording}
                        className={status === 'recording' ? 'btn-pulse' : ''}
                        style={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: status === 'recording' ? 'rgba(255, 51, 102, 0.3)' : 'rgba(255, 51, 102, 0.15)',
                            border: '1px solid var(--accent-red)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: status === 'recording' ? '0 0 30px rgba(255, 51, 102, 0.5)' : '0 0 20px rgba(255, 51, 102, 0.3)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            transform: status === 'recording' ? 'scale(1.05)' : 'scale(1)'
                        }}>
                        <div style={{ width: 60, height: 60, borderRadius: status === 'recording' ? '20%' : '50%', background: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)', transition: 'all 0.3s' }}>
                            {status === 'recording' ? (
                                <Square size={24} fill="white" color="white" />
                            ) : (
                                <Mic size={28} color="white" />
                            )}
                        </div>
                    </button>

                    <button className="btn btn-glass" style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Volume2 size={20} />
                    </button>
                </div>

                {/* Session Control */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div className="text-mono" style={{ fontSize: 'var(--text-base)' }}>00:12 / 10:00</div>
                    <button className="btn btn-glass" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Detection Status Card */}
            <div className="glass-panel" style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <div style={{ position: 'relative' }}>
                        <ShieldCheck size={56} color={isDeepfake ? "var(--accent-red)" : "var(--accent-green)"} />
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', filter: 'blur(10px)', background: isDeepfake ? "var(--accent-red)" : "var(--accent-green)", opacity: 0.2, borderRadius: '50%' }}></div>
                    </div>
                    <div>
                        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: isDeepfake ? "var(--accent-red)" : "var(--accent-green)", letterSpacing: 1 }}>
                            {isConnected ? (isDeepfake ? 'DEEPFAKE DETECTED' : 'AUTHENTIC') : 'READY'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: 10, background: 'rgba(0,255,136,0.1)', color: 'var(--accent-green)', border: '1px solid rgba(0,255,136,0.2)' }}>Neural Vocoder Check</span>
                            <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}>Spectral Analysis</span>
                        </div>
                    </div>
                </div>

                {/* Confidence Meter Details */}
                <div style={{ flex: 1, maxWidth: '400px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span className="text-secondary" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Confidence Score</span>
                        <span style={{ fontWeight: 'bold', fontSize: 'var(--text-lg)' }}>
                            {isConnected ? `${currentConfidence.toFixed(1)}%` : '--%'}
                        </span>
                    </div>

                    {/* Segmented Bar */}
                    <div style={{ display: 'flex', gap: 4, height: 12 }}>
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} style={{
                                flex: 1,
                                background: isConnected && (i / 10 * 100) < currentConfidence
                                    ? (isDeepfake ? 'var(--accent-red)' : 'var(--accent-green)')
                                    : 'rgba(255,255,255,0.1)',
                                borderRadius: 2,
                                boxShadow: isConnected && (i / 10 * 100) < currentConfidence
                                    ? `0 0 8px ${isDeepfake ? 'var(--accent-red)' : 'var(--accent-green)'}`
                                    : 'none',
                                transition: 'all 0.3s'
                            }}></div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, gap: 16 }}>
                        <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>● Authentic (70-100%)</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>● Uncertain</span>
                        <span style={{ fontSize: '11px', color: 'var(--accent-red)' }}>● Fake</span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slideInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};
