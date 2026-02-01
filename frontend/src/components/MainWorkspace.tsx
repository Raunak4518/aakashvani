import { useState, useEffect, useRef } from 'react';
import { Mic, Play, Square, RefreshCw, ShieldCheck, ChevronDown, Volume2, Activity, Loader2, AlertCircle } from 'lucide-react';
import { SpectrogramViewer } from './specialized/SpectrogramViewer';
import { ConfidenceTimeline } from './specialized/ConfidenceTimeline';
import { useSession } from '../context/SessionContext';
import { useDetection } from '../context/DetectionContext';
import { useSettings } from '../context/SettingsContext';

export const MainWorkspace = () => {
    const [showSpectrogram, setShowSpectrogram] = useState(false);
    const { startSession, stopSession, status, setSessionError, errorMessage } = useSession();
    const { startRecording, stopRecording, isConnected, isDeepfake, currentConfidence, connectionState, stats, audioContext, audioStream } = useDetection();

    // Derive connection states from session status
    const isConnecting = status === 'connecting';
    const connectionError = status === 'error' ? errorMessage : null;

    // Settings for audio device
    const { settings, audioDevices, updateSetting } = useSettings();
    const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
    const inputDevices = audioDevices.filter(d => d.kind === 'audioinput');
    const selectedDevice = inputDevices.find(d => d.deviceId === settings.inputDevice) || inputDevices[0];

    // Real audio visualization
    const [audioLevels, setAudioLevels] = useState<number[]>(new Array(60).fill(5));
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);

    // Setup audio analyzer for real waveform
    useEffect(() => {
        if (!audioContext || !audioStream || !isConnected) {
            setAudioLevels(new Array(60).fill(5));
            return;
        }

        try {
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 128;
            const source = audioContext.createMediaStreamSource(audioStream);
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateLevels = () => {
                if (!analyserRef.current) return;

                analyserRef.current.getByteFrequencyData(dataArray);

                // Map frequency data to 60 bars
                const levels: number[] = [];
                const step = Math.floor(dataArray.length / 60);
                for (let i = 0; i < 60; i++) {
                    const value = dataArray[i * step] || 0;
                    levels.push(Math.max(5, (value / 255) * 100));
                }
                setAudioLevels(levels);

                animationRef.current = requestAnimationFrame(updateLevels);
            };

            updateLevels();

            return () => {
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
                source.disconnect();
            };
        } catch (e) {
            console.error("Failed to setup audio analyzer:", e);
        }
    }, [audioContext, audioStream, isConnected]);

    const handleToggleRecording = async () => {
        if (status === 'recording' || status === 'connecting') {
            stopSession();
            stopRecording();
        } else {
            try {
                await startSession(); // Sets status to 'connecting'

                // Add timeout for connection attempt (10 seconds)
                const connectionTimeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), 10000)
                );

                await Promise.race([
                    startRecording(),
                    connectionTimeout
                ]);
            } catch (error) {
                console.error('Connection failed:', error);
                const errorMsg = error instanceof Error && error.message === 'Connection timeout'
                    ? 'Something went wrong - connection timed out'
                    : 'Something went wrong';
                setSessionError(errorMsg);
                stopRecording();
            }
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

                {/* Real Waveform Bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60%', width: '100%', justifyContent: 'center' }}>
                    {audioLevels.map((level, i) => {
                        // Color based on deepfake detection
                        let color = 'var(--accent-green)';
                        if (isDeepfake) color = 'var(--accent-red)';
                        else if (currentConfidence > 0 && currentConfidence < 70) color = 'var(--accent-orange)';

                        return (
                            <div key={i} style={{
                                flex: 1,
                                height: `${level}%`,
                                background: `linear-gradient(to top, ${color}, transparent)`,
                                borderRadius: 2,
                                opacity: 0.8,
                                transition: 'height 0.05s ease'
                            }}></div>
                        )
                    })}
                </div>
            </div>

            {/* Confidence Timeline */}
            <ConfidenceTimeline />

            {/* Audio Control Panel - Improved Design */}
            <div className="glass-panel" style={{
                padding: 'var(--space-4)',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: 'var(--space-4)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
            }}>

                {/* Left: Input Source + Level Meter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    {/* Input Device Selector */}
                    <div style={{ position: 'relative' }}>
                        <div
                            className="glass-panel"
                            onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
                            style={{
                                padding: '10px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                cursor: 'pointer',
                                borderRadius: 24,
                                transition: 'all 0.2s',
                                border: showDeviceDropdown ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            <div style={{
                                width: 32, height: 32,
                                borderRadius: '50%',
                                background: isConnected ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: isConnected ? '1px solid rgba(0,255,136,0.3)' : '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <Mic size={16} color={isConnected ? 'var(--accent-green)' : 'var(--text-secondary)'} />
                            </div>
                            <div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 2 }}>INPUT</div>
                                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {selectedDevice?.label || 'Select Device'}
                                </div>
                            </div>
                            <ChevronDown size={16} color="var(--text-secondary)" style={{ marginLeft: 4, transform: showDeviceDropdown ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                        </div>

                        {/* Device Dropdown */}
                        {showDeviceDropdown && (
                            <div
                                className="glass-panel"
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    marginTop: 8,
                                    minWidth: 250,
                                    zIndex: 100,
                                    padding: 'var(--space-2)',
                                    borderRadius: 12,
                                    background: 'rgba(10, 14, 39, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                                }}
                            >
                                {inputDevices.length === 0 ? (
                                    <div style={{ padding: 12, color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                                        No microphones found
                                    </div>
                                ) : (
                                    inputDevices.map(device => (
                                        <div
                                            key={device.deviceId}
                                            onClick={() => {
                                                updateSetting('inputDevice', device.deviceId);
                                                setShowDeviceDropdown(false);
                                            }}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                background: device.deviceId === settings.inputDevice ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                                                color: device.deviceId === settings.inputDevice ? 'var(--accent-cyan)' : 'var(--text-primary)',
                                                fontSize: 'var(--text-sm)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                transition: 'background 0.2s'
                                            }}
                                        >
                                            <Mic size={14} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {device.label}
                                            </span>
                                            {device.deviceId === settings.inputDevice && (
                                                <span style={{ marginLeft: 'auto', color: 'var(--accent-green)' }}>✓</span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Audio Level Meter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>LEVEL</div>
                        <div style={{ display: 'flex', gap: 2, height: 20, alignItems: 'flex-end' }}>
                            {Array.from({ length: 10 }).map((_, i) => {
                                const threshold = (i + 1) * 10;
                                const avgLevel = audioLevels.reduce((a, b) => a + b, 0) / audioLevels.length;
                                const isActive = isConnected && avgLevel >= threshold;
                                let color = 'rgba(255,255,255,0.1)';
                                if (isActive) {
                                    if (i < 6) color = 'var(--accent-green)';
                                    else if (i < 8) color = 'var(--accent-orange)';
                                    else color = 'var(--accent-red)';
                                }
                                return (
                                    <div key={i} style={{
                                        flex: 1,
                                        height: `${40 + i * 6}%`,
                                        background: color,
                                        borderRadius: 2,
                                        transition: 'background 0.1s'
                                    }} />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Center: Main Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    {/* Skip Back / Previous */}
                    <button
                        className="btn btn-glass"
                        style={{
                            width: 48, height: 48,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.6,
                            cursor: 'not-allowed'
                        }}
                        disabled
                    >
                        <Play size={18} color="var(--text-secondary)" style={{ transform: 'rotate(180deg)' }} />
                    </button>

                    {/* Main Record Button */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={handleToggleRecording}
                            disabled={isConnecting}
                            className={status === 'recording' ? 'btn-pulse' : ''}
                            style={{
                                width: 80, height: 80,
                                borderRadius: '50%',
                                background: isConnecting
                                    ? 'radial-gradient(circle, rgba(0, 212, 255, 0.3) 0%, rgba(0, 212, 255, 0.1) 100%)'
                                    : connectionError
                                        ? 'radial-gradient(circle, rgba(255, 136, 0, 0.3) 0%, rgba(255, 136, 0, 0.1) 100%)'
                                        : status === 'recording'
                                            ? 'radial-gradient(circle, rgba(255, 51, 102, 0.4) 0%, rgba(255, 51, 102, 0.2) 100%)'
                                            : 'radial-gradient(circle, rgba(255, 51, 102, 0.2) 0%, rgba(255, 51, 102, 0.1) 100%)',
                                border: `2px solid ${isConnecting ? 'var(--accent-cyan)' : connectionError ? 'var(--accent-orange)' : 'var(--accent-red)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: isConnecting
                                    ? '0 0 40px rgba(0, 212, 255, 0.5)'
                                    : status === 'recording'
                                        ? '0 0 40px rgba(255, 51, 102, 0.6), inset 0 0 20px rgba(255, 51, 102, 0.3)'
                                        : '0 0 20px rgba(255, 51, 102, 0.3)',
                                cursor: isConnecting ? 'wait' : 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: status === 'recording' ? 'scale(1.05)' : 'scale(1)',
                                position: 'relative',
                                opacity: isConnecting ? 0.9 : 1
                            }}
                        >
                            {/* Animated ring when recording */}
                            {status === 'recording' && (
                                <div style={{
                                    position: 'absolute',
                                    inset: -4,
                                    borderRadius: '50%',
                                    border: '2px solid var(--accent-red)',
                                    opacity: 0.5,
                                    animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                                }} />
                            )}
                            {/* Spinning ring when connecting */}
                            {isConnecting && (
                                <div style={{
                                    position: 'absolute',
                                    inset: -4,
                                    borderRadius: '50%',
                                    border: '2px solid transparent',
                                    borderTopColor: 'var(--accent-cyan)',
                                    borderRightColor: 'var(--accent-cyan)',
                                    animation: 'spin 1s linear infinite'
                                }} />
                            )}
                            <div style={{
                                width: 64, height: 64,
                                borderRadius: status === 'recording' ? '16px' : '50%',
                                background: isConnecting
                                    ? 'linear-gradient(135deg, var(--accent-cyan) 0%, #0099cc 100%)'
                                    : connectionError
                                        ? 'linear-gradient(135deg, var(--accent-orange) 0%, #cc7700 100%)'
                                        : 'linear-gradient(135deg, var(--accent-red) 0%, #ff1a4b 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.2), inset 0 -2px 10px rgba(0,0,0,0.2)',
                                transition: 'all 0.3s'
                            }}>
                                {isConnecting ? (
                                    <Loader2 size={28} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                                ) : connectionError ? (
                                    <AlertCircle size={28} color="white" />
                                ) : status === 'recording' ? (
                                    <Square size={26} fill="white" color="white" />
                                ) : (
                                    <Mic size={30} color="white" />
                                )}
                            </div>
                        </button>

                        {/* Status Text Below Button */}
                        <div style={{
                            position: 'absolute',
                            bottom: -24,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            whiteSpace: 'nowrap',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: isConnecting ? 'var(--accent-cyan)' : connectionError ? 'var(--accent-orange)' : status === 'recording' ? 'var(--accent-red)' : 'var(--text-tertiary)',
                            transition: 'all 0.3s'
                        }}>
                            {isConnecting ? 'Connecting...' : connectionError ? 'Failed!' : status === 'recording' ? 'Recording' : 'Ready'}
                        </div>
                    </div>

                    {/* Skip Forward / Next */}
                    <button
                        className="btn btn-glass"
                        style={{
                            width: 48, height: 48,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.6,
                            cursor: 'not-allowed'
                        }}
                        disabled
                    >
                        <Play size={18} color="var(--text-secondary)" />
                    </button>
                </div>

                {/* Right: Volume + Reset */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-3)' }}>
                    {/* Volume Control */}
                    <button
                        className="btn btn-glass"
                        style={{
                            width: 44, height: 44,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Volume2 size={18} color="var(--text-secondary)" />
                    </button>

                    {/* Reset Button */}
                    <button
                        onClick={() => {
                            if (status === 'recording') {
                                stopSession();
                                stopRecording();
                            }
                        }}
                        className="btn btn-glass"
                        style={{
                            width: 44, height: 44,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            opacity: status === 'recording' ? 1 : 0.5
                        }}
                        disabled={status !== 'recording'}
                    >
                        <RefreshCw size={16} color="var(--text-secondary)" />
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
                @keyframes ping { 
                    0% { transform: scale(1); opacity: 0.5; } 
                    75%, 100% { transform: scale(1.3); opacity: 0; } 
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
