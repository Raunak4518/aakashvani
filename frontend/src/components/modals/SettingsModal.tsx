import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Save, Mic, Volume2, Cpu, Database, Globe, Moon, Clock, Shield, Activity, RefreshCw, Trash2, Download } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General', icon: <Globe size={16} /> },
        { id: 'audio', label: 'Audio', icon: <Volume2 size={16} /> },
        { id: 'detection', label: 'Detection', icon: <Cpu size={16} /> },
        { id: 'advanced', label: 'Advanced', icon: <Database size={16} /> },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Settings"
            width="680px"
            height="720px"
            footer={
                <>
                    <button className="btn btn-glass" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Save size={16} /> Save & Apply
                    </button>
                </>
            }
        >
            <div style={{ display: 'flex', height: '100%', minHeight: '500px' }}>
                {/* Sidebar Tabs */}
                <div style={{ width: '180px', borderRight: '1px solid rgba(255,255,255,0.1)', marginRight: 'var(--space-4)', paddingRight: 'var(--space-2)' }}>
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: activeTab === tab.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                                color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                                fontWeight: activeTab === tab.id ? 600 : 400,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginBottom: 4,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </div>
                    ))}
                </div>

                {/* Tab Content */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>

                    {activeTab === 'general' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <Section title="Appearance">
                                <Select
                                    label="Theme Mode"
                                    options={['Dark Mode (Default)', 'Light Mode', 'Auto (System)']}
                                    selected="Dark Mode (Default)"
                                    icon={<Moon size={14} />}
                                />
                                <Select
                                    label="Language"
                                    options={['English (US)', 'Hindi', 'Spanish', 'French']}
                                    selected="English (US)"
                                    icon={<Globe size={14} />}
                                />
                            </Section>

                            <Section title="System">
                                <Select
                                    label="Timezone"
                                    options={['(UTC-05:00) Eastern Time', '(UTC+00:00) UTC', '(UTC+05:30) IST']}
                                    selected="(UTC+05:30) IST"
                                    icon={<Clock size={14} />}
                                />
                                <Toggle label="Auto-save Session Data" checked={true} description="Automatically save analysis results locally" />
                            </Section>
                        </div>
                    )}

                    {activeTab === 'audio' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <Section title="Input & Output">
                                <Select
                                    label="Input Device (Microphone)"
                                    options={['Default - MacBook Pro Mic', 'External USB Mic (Blue Yeti)', 'Virtual Cable A']}
                                    icon={<Mic size={14} />}
                                />
                                <div style={{ marginTop: 8 }}>
                                    <button className="btn btn-glass" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Activity size={14} color="var(--accent-green)" /> Test Input Signal
                                    </button>
                                </div>
                                <div style={{ height: 'var(--space-2)' }} />
                                <Select
                                    label="Output Device"
                                    options={['Default - MacBook Pro Speakers', 'External Headphones']}
                                    icon={<Volume2 size={14} />}
                                />
                            </Section>

                            <Section title="Processing">
                                <Toggle label="Noise Cancellation" checked={true} description="Reduce background noise from input" />
                                <Toggle label="Auto Gain Control" checked={true} description="Normalize audio volume automatically" />
                            </Section>

                            <Section title="Quality">
                                <Select label="Sample Rate" options={['16000 Hz', '24000 Hz', '44100 Hz', '48000 Hz']} selected="48000 Hz" />
                                <Slider label="Buffer Size" value={512} min={128} max={2048} unit=" samples" />
                            </Section>
                        </div>
                    )}

                    {activeTab === 'detection' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <Section title="Active Algorithms">
                                <Checkbox label="Spectral Analysis" checked={true} description="Analyze frequency spectrum inconsistencies" />
                                <Checkbox label="Neural Vocoder Detection" checked={true} description="Detect artifacts from GAN-based vocoders" />
                                <Checkbox label="Prosody Analysis" checked={true} description="Analyze speech rhythm and intonation" />
                                <Checkbox label="Multi-modal Fusion" checked={false} description="Combine audio with video cues (if available)" />
                            </Section>
                            <Section title="Sensitivity & Thresholds">
                                <Slider label="Confidence Threshold" value={70} min={50} max={95} unit="%" />
                                <Select
                                    label="False Positive Tolerance"
                                    options={['Low (Strict)', 'Medium (Balanced)', 'High (Permissive)']}
                                    selected="Medium (Balanced)"
                                    icon={<Shield size={14} />}
                                />
                                <Toggle label="Enable Experimental Features" checked={false} description="Use beta detection models" />
                            </Section>
                        </div>
                    )}

                    {activeTab === 'advanced' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <Section title="Network & API">
                                <div className="glass-panel" style={{ padding: '12px', background: 'rgba(0,0,0,0.2)' }}>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>API Endpoint</label>
                                    <input
                                        type="text"
                                        defaultValue="wss://api.voiceguard.ai/v1/stream"
                                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-mono)', fontFamily: 'monospace', outline: 'none' }}
                                    />
                                </div>
                            </Section>

                            <Section title="Developer Tools">
                                <Toggle label="Debug Mode" checked={false} description="Show verbose logs in console" />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                                    <button className="btn btn-glass" style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Download size={14} /> Export System Logs
                                    </button>
                                    <button className="btn btn-glass" style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <RefreshCw size={14} /> Clear Application Cache
                                    </button>
                                    <button className="btn btn-glass" style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-red)', borderColor: 'rgba(255, 51, 102, 0.3)' }}>
                                        <Trash2 size={14} /> Reset All Settings
                                    </button>
                                </div>
                            </Section>
                        </div>
                    )}

                </div>
            </div>
        </Modal>
    );
};

/* Helper Components */
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div style={{ marginBottom: 'var(--space-2)' }}>
        <h4 style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            fontWeight: 600,
            marginBottom: 'var(--space-3)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            paddingBottom: '4px'
        }}>{title}</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>{children}</div>
    </div>
)

const Select = ({ label, options, selected, icon }: { label: string, options: string[], selected?: string, icon?: React.ReactNode }) => (
    <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {icon} {label}
        </label>
        <div className="glass-panel" style={{ position: 'relative', background: 'rgba(255,255,255,0.03)' }}>
            <select
                defaultValue={selected}
                style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                }}>
                {options.map(o => <option key={o} style={{ background: '#0a0e27' }}>{o}</option>)}
            </select>
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>▼</div>
        </div>
    </div>
)

const Toggle = ({ label, checked, description }: { label: string, checked: boolean, description?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
        <div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{label}</div>
            {description && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{description}</div>}
        </div>
        <div style={{
            width: 44,
            height: 24,
            background: checked ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.05)',
            border: checked ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.3s cubic-bezier(0.4, 0, 0.2, 1), border 0.3s ease'
        }}>
            <div style={{
                width: 18,
                height: 18,
                background: checked ? 'var(--accent-cyan)' : 'var(--text-tertiary)',
                borderRadius: '50%',
                position: 'absolute',
                top: 2,
                left: checked ? 22 : 2,
                transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease', // Spring physics
                boxShadow: checked ? '0 0 10px var(--accent-cyan)' : 'none'
            }}></div>
        </div>
    </div>
)

const Checkbox = ({ label, checked, description }: { label: string, checked: boolean, description?: string }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '4px 0' }}>
        <div style={{
            marginTop: 2,
            width: 20,
            height: 20,
            border: checked ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.3)',
            borderRadius: 6,
            background: checked ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: checked ? 'scale(1)' : 'scale(0.9)'
        }}>
            {checked && <div className="animate-scale-in" style={{ width: 10, height: 10, background: 'var(--accent-cyan)', borderRadius: 2 }}></div>}
        </div>
        <div>
            <div style={{ fontSize: 'var(--text-sm)', color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</div>
            {description && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{description}</div>}
        </div>
    </div>
)

const Slider = ({ label, value, min, max, unit }: { label: string, value: number, min: number, max: number, unit?: string }) => {
    const percentage = ((value - min) / (max - min)) * 100;
    return (
        <div className="group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{label}</span>
                <span className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-cyan)' }}>{value}{unit}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-green))', borderRadius: 3, transition: 'width 0.1s linear' }}></div>
                <div style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: -4,
                    left: `${percentage}%`,
                    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                    cursor: 'grab',
                    transform: 'translate(-50%) scale(1)',
                    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.1s linear'
                }}></div>
            </div>
        </div>
    )
}
