import { Mic, Square, Play, Pause, Volume2, Settings } from 'lucide-react';
import type { AudioDevice } from '../../hooks/useAudioRecorder';

interface AudioControlPanelProps {
    isRecording: boolean;
    onToggleRecording: () => void;
    volume: number;
    onVolumeChange: (val: number) => void;
    devices: AudioDevice[];
    selectedDeviceId: string;
    onDeviceChange: (id: string) => void;
}

export const AudioControlPanel = ({
    isRecording,
    onToggleRecording,
    volume,
    onVolumeChange,
    devices,
    selectedDeviceId,
    onDeviceChange
}: AudioControlPanelProps) => {
    return (
        <div className="glass-panel" style={{
            padding: '16px 24px',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)'
        }}>
            {/* Left: Device Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 }}>
                <span className="text-secondary" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: 1 }}>Input Device</span>
                <select
                    value={selectedDeviceId}
                    onChange={(e) => onDeviceChange(e.target.value)}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'var(--text-primary)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        outline: 'none'
                    }}
                >
                    <option value="default">System Default</option>
                    {devices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                    ))}
                </select>
            </div>

            {/* Center: Main Record Button */}
            <div style={{ position: 'relative' }}>
                <button
                    onClick={onToggleRecording}
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        border: 'none',
                        background: isRecording ? 'var(--accent-red)' : 'var(--bg-secondary)',
                        color: 'white',
                        boxShadow: isRecording ? '0 0 24px var(--accent-red)' : '0 4px 12px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                >
                    {isRecording ? <Square size={24} fill="white" /> : <Mic size={28} />}
                </button>
                {/* Pulse Ring */}
                {isRecording && (
                    <div style={{
                        position: 'absolute',
                        top: -4,
                        left: -4,
                        right: -4,
                        bottom: -4,
                        borderRadius: '50%',
                        border: '2px solid var(--accent-red)',
                        animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                        opacity: 0.5
                    }}></div>
                )}
            </div>

            {/* Right: Volume & Playback */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                {/* Volume */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Volume2 size={16} className="text-secondary" />
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                        style={{ width: 100, accentColor: 'var(--accent-cyan)' }}
                    />
                    <span className="text-secondary" style={{ fontSize: '10px', width: 24 }}>{Math.round(volume * 100)}%</span>
                </div>
            </div>
        </div>
    );
};
