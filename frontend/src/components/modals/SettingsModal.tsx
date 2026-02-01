import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Save, Mic, Volume2, Cpu, Database, Globe, Moon, Activity, RefreshCw, Trash2, Download } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const [activeTab, setActiveTab] = useState('general');
    const { settings, updateSetting, saveSettings, resetSettings, audioDevices, hasUnsavedChanges } = useSettings();

    const inputDevices = audioDevices.filter(d => d.kind === 'audioinput');
    const outputDevices = audioDevices.filter(d => d.kind === 'audiooutput');

    const tabs = [
        { id: 'general', label: 'General', icon: <Globe size={16} /> },
        { id: 'audio', label: 'Audio', icon: <Volume2 size={16} /> },
        { id: 'detection', label: 'Detection', icon: <Cpu size={16} /> },
        { id: 'advanced', label: 'Advanced', icon: <Database size={16} /> },
    ];

    const handleSave = () => {
        saveSettings();
        onClose();
    };

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
                    <button
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: hasUnsavedChanges ? 1 : 0.5 }}
                        onClick={handleSave}
                    >
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
                                    options={[
                                        { value: 'dark', label: 'Dark Mode (Default)' },
                                        { value: 'light', label: 'Light Mode' },
                                        { value: 'auto', label: 'Auto (System)' }
                                    ]}
                                    value={settings.theme}
                                    onChange={(v) => updateSetting('theme', v as 'dark' | 'light' | 'auto')}
                                    icon={<Moon size={14} />}
                                />
                                <Select
                                    label="Language"
                                    options={[
                                        { value: 'English (US)', label: 'English (US)' },
                                        { value: 'Hindi', label: 'Hindi' },
                                        { value: 'Spanish', label: 'Spanish' }
                                    ]}
                                    value={settings.language}
                                    onChange={(v) => updateSetting('language', v)}
                                    icon={<Globe size={14} />}
                                />
                            </Section>

                            <Section title="System">
                                <Slider
                                    label="Session Timeout"
                                    value={settings.sessionTimeout}
                                    min={5}
                                    max={120}
                                    unit=" min"
                                    onChange={(v) => updateSetting('sessionTimeout', v)}
                                />
                            </Section>
                        </div>
                    )}

                    {activeTab === 'audio' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <Section title="Input & Output">
                                <Select
                                    label="Input Device (Microphone)"
                                    options={inputDevices.map(d => ({ value: d.deviceId, label: d.label }))}
                                    value={settings.inputDevice}
                                    onChange={(v) => updateSetting('inputDevice', v)}
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
                                    options={outputDevices.map(d => ({ value: d.deviceId, label: d.label }))}
                                    value={settings.outputDevice}
                                    onChange={(v) => updateSetting('outputDevice', v)}
                                    icon={<Volume2 size={14} />}
                                />
                            </Section>

                            <Section title="Processing">
                                <Toggle
                                    label="Noise Reduction"
                                    checked={settings.noiseReduction}
                                    onChange={(v) => updateSetting('noiseReduction', v)}
                                    description="Reduce background noise from input"
                                />
                                <Toggle
                                    label="Echo Cancellation"
                                    checked={settings.echoCancellation}
                                    onChange={(v) => updateSetting('echoCancellation', v)}
                                    description="Remove echo from audio"
                                />
                                <Toggle
                                    label="Auto Gain Control"
                                    checked={settings.autoGainControl}
                                    onChange={(v) => updateSetting('autoGainControl', v)}
                                    description="Normalize audio volume automatically"
                                />
                            </Section>

                            <Section title="Quality">
                                <Select
                                    label="Sample Rate"
                                    options={[
                                        { value: '16000', label: '16000 Hz' },
                                        { value: '24000', label: '24000 Hz' },
                                        { value: '44100', label: '44100 Hz' },
                                        { value: '48000', label: '48000 Hz' }
                                    ]}
                                    value={String(settings.sampleRate)}
                                    onChange={(v) => updateSetting('sampleRate', parseInt(v))}
                                />
                                <Slider
                                    label="Buffer Size"
                                    value={settings.bufferSize}
                                    min={256}
                                    max={8192}
                                    unit=" samples"
                                    onChange={(v) => updateSetting('bufferSize', v)}
                                />
                            </Section>
                        </div>
                    )}

                    {activeTab === 'detection' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <Section title="Sensitivity & Thresholds">
                                <Slider
                                    label="Confidence Threshold"
                                    value={settings.sensitivityThreshold}
                                    min={50}
                                    max={95}
                                    unit="%"
                                    onChange={(v) => updateSetting('sensitivityThreshold', v)}
                                />
                                <Slider
                                    label="Analysis Window"
                                    value={settings.analysisWindow}
                                    min={1}
                                    max={10}
                                    unit="s"
                                    onChange={(v) => updateSetting('analysisWindow', v)}
                                />
                            </Section>
                            <Section title="Alerts">
                                <Toggle
                                    label="Real-time Alerts"
                                    checked={settings.realTimeAlerts}
                                    onChange={(v) => updateSetting('realTimeAlerts', v)}
                                    description="Show notifications for detections"
                                />
                                <Toggle
                                    label="Alert Sounds"
                                    checked={settings.alertSounds}
                                    onChange={(v) => updateSetting('alertSounds', v)}
                                    description="Play sound on deepfake detection"
                                />
                                <Toggle
                                    label="Auto-record Suspicious Audio"
                                    checked={settings.autoRecordSuspicious}
                                    onChange={(v) => updateSetting('autoRecordSuspicious', v)}
                                    description="Automatically save suspicious audio clips"
                                />
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
                                        value={settings.apiEndpoint}
                                        onChange={(e) => updateSetting('apiEndpoint', e.target.value)}
                                        style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-mono)', fontFamily: 'monospace', outline: 'none' }}
                                    />
                                </div>
                                <Slider
                                    label="Max Retries"
                                    value={settings.maxRetries}
                                    min={1}
                                    max={10}
                                    unit=""
                                    onChange={(v) => updateSetting('maxRetries', v)}
                                />
                            </Section>

                            <Section title="Developer Tools">
                                <Toggle
                                    label="Debug Mode"
                                    checked={settings.debugMode}
                                    onChange={(v) => updateSetting('debugMode', v)}
                                    description="Show verbose logs in console"
                                />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                                    <button className="btn btn-glass" style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Download size={14} /> Export System Logs
                                    </button>
                                    <button className="btn btn-glass" style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <RefreshCw size={14} /> Clear Application Cache
                                    </button>
                                    <button
                                        className="btn btn-glass"
                                        style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-red)', borderColor: 'rgba(255, 51, 102, 0.3)' }}
                                        onClick={resetSettings}
                                    >
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
    <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{title}</div>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {children}
        </div>
    </div>
)

interface SelectOption {
    value: string;
    label: string;
}

const Select = ({ label, options, value, onChange, icon }: {
    label: string,
    options: SelectOption[],
    value: string,
    onChange: (value: string) => void,
    icon?: React.ReactNode
}) => (
    <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {icon} {label}
        </label>
        <div className="glass-panel" style={{ position: 'relative', background: 'rgba(255,255,255,0.03)' }}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
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
                {options.map(o => <option key={o.value} value={o.value} style={{ background: '#0a0e27' }}>{o.label}</option>)}
            </select>
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>▼</div>
        </div>
    </div>
)

const Toggle = ({ label, checked, onChange, description }: {
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
    description?: string
}) => (
    <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', cursor: 'pointer' }}
        onClick={() => onChange(!checked)}
    >
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
                transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease',
                boxShadow: checked ? '0 0 10px var(--accent-cyan)' : 'none'
            }}></div>
        </div>
    </div>
)

const Slider = ({ label, value, min, max, unit, onChange }: {
    label: string,
    value: number,
    min: number,
    max: number,
    unit?: string,
    onChange: (value: number) => void
}) => {
    const percentage = ((value - min) / (max - min)) * 100;
    return (
        <div className="group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{label}</span>
                <span className="text-mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-cyan)' }}>{value}{unit}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                style={{
                    width: '100%',
                    height: 6,
                    appearance: 'none',
                    background: `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`,
                    borderRadius: 3,
                    cursor: 'pointer',
                    outline: 'none'
                }}
            />
        </div>
    )
}
