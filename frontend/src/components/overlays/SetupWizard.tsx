import { useState } from 'react';
import { Check, ChevronRight, Mic, Volume2, Shield, Settings, X } from 'lucide-react';

interface SetupWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SetupWizard = ({ isOpen, onClose }: SetupWizardProps) => {
    const [step, setStep] = useState(1);
    const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending');

    if (!isOpen) return null;

    const nextStep = () => {
        if (step < 5) setStep(step + 1);
        else onClose();
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const requestMic = () => {
        // Simulate permission request
        setTimeout(() => setMicPermission('granted'), 800);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 14, 39, 0.95)',
            backdropFilter: 'blur(10px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div className="glass-panel" style={{
                width: '800px',
                height: '500px',
                display: 'grid',
                gridTemplateColumns: '300px 1fr',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                {/* Left Sidebar - Steps */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold'
                        }}>
                            VG
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        <StepIndicator current={step} step={1} label="Welcome" icon={<Shield size={16} />} />
                        <StepIndicator current={step} step={2} label="Permissions" icon={<Mic size={16} />} />
                        <StepIndicator current={step} step={3} label="Audio Check" icon={<Volume2 size={16} />} />
                        <StepIndicator current={step} step={4} label="Preferences" icon={<Settings size={16} />} />
                        <StepIndicator current={step} step={5} label="Finish" icon={<Check size={16} />} />
                    </div>

                    <div style={{ marginTop: 'auto', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        VoiceGuard AI v2.0.1
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', position: 'relative' }}>

                    {/* Close button (skip) */}
                    <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                        <X size={20} />
                    </button>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

                        {/* Step 1: Welcome */}
                        {step === 1 && (
                            <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                                {/* Hero Illustration (CSS Art) */}
                                <div style={{
                                    width: 120, height: 120, margin: '0 auto var(--space-4)', position: 'relative',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <div style={{ position: 'absolute', inset: 0, background: 'var(--accent-cyan)', opacity: 0.2, borderRadius: '50%', filter: 'blur(20px)', animation: 'pulse 3s infinite' }}></div>
                                    <Shield size={64} color="var(--accent-cyan)" fill="rgba(0, 212, 255, 0.1)" strokeWidth={1} style={{ zIndex: 2 }} />
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '140%', height: '140%', border: '1px dashed rgba(0, 212, 255, 0.3)', borderRadius: '50%', transform: 'translate(-50%, -50%)', animation: 'spin 10s linear infinite' }}></div>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: '180%', height: '180%', border: '1px solid rgba(0, 212, 255, 0.1)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }}></div>
                                </div>

                                <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', marginBottom: 'var(--space-2)' }}>Welcome to VoiceGuard AI</h1>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto var(--space-4)' }}>
                                    Your advanced AI-powered shield against deepfake voice attacks.
                                    Let's get you set up in just a few seconds.
                                </p>
                                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                                    <FeatureTag label="Real-time Detection" />
                                    <FeatureTag label="Spectral Analysis" />
                                    <FeatureTag label="Local Processing" />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Permissions */}
                        {step === 2 && (
                            <div className="animate-fade-in">
                                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', marginBottom: 'var(--space-3)' }}>Microphone Access</h2>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                                    To analyze audio for anomalies, VoiceGuard needs access to your input device.
                                    Processing happens locally on your machine.
                                </p>

                                <div style={{
                                    padding: 'var(--space-4)',
                                    background: micPermission === 'granted' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                                    border: micPermission === 'granted' ? '1px solid var(--accent-green)' : '1px solid rgba(255,255,255,0.1)',
                                    transition: 'all 0.3s'
                                }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Mic size={24} className={micPermission === 'granted' ? 'text-accent-green' : 'text-secondary'} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{micPermission === 'granted' ? 'Access Granted' : 'Microphone Permission'}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            {micPermission === 'granted' ? 'You are ready to proceed.' : 'Click allow when prompted by the browser.'}
                                        </div>
                                    </div>
                                    {micPermission !== 'granted' && (
                                        <button className="btn btn-primary" onClick={requestMic} style={{ marginLeft: 'auto' }}>Allow</button>
                                    )}
                                    {micPermission === 'granted' && (
                                        <Check size={24} className="text-accent-green" style={{ marginLeft: 'auto' }} />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Audio Test */}
                        {step === 3 && (
                            <div className="animate-fade-in">
                                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', marginBottom: 'var(--space-3)' }}>Input Check</h2>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                                    Speak into your microphone to verify signal quality.
                                </p>
                                <div style={{ height: 120, background: 'rgba(0,0,0,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
                                    {/* Fake visualizer */}
                                    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 40 }}>
                                        {Array.from({ length: 20 }).map((_, i) => (
                                            <div key={i} style={{
                                                width: 8,
                                                height: `${Math.random() * 100}%`,
                                                background: 'var(--accent-cyan)',
                                                borderRadius: 4,
                                                animation: `bounce ${0.5 + Math.random()}s infinite ease-in-out`
                                            }}></div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--accent-green)', fontSize: '14px' }}>
                                    <Check size={16} /> Signal Detected: -12dB (Good)
                                </div>
                            </div>
                        )}

                        {/* Step 4: Preferences */}
                        {step === 4 && (
                            <div className="animate-fade-in">
                                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold', marginBottom: 'var(--space-3)' }}>Quick Preferences</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                    <PreferenceToggle label="Enable Real-time Alerts" description="Show popup when deepfake likely" defaultChecked={true} />
                                    <PreferenceToggle label="Auto-Record Sessions" description="Save analyzed audio segments" defaultChecked={false} />
                                    <PreferenceToggle label="High Precision Mode" description="Uses more CPU, better accuracy" defaultChecked={true} />
                                </div>
                            </div>
                        )}

                        {/* Step 5: Complete */}
                        {step === 5 && (
                            <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4) auto',
                                    boxShadow: '0 0 30px rgba(0, 212, 255, 0.4)'
                                }}>
                                    <Check size={40} color="#fff" strokeWidth={3} />
                                </div>
                                <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', marginBottom: 'var(--space-2)' }}>You're All Set!</h2>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                                    VoiceGuard is now active and monitoring your audio stream.
                                </p>
                            </div>
                        )}

                    </div>

                    {/* Navigation Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {step > 1 ? (
                            <button className="btn btn-glass" onClick={prevStep}>Back</button>
                        ) : <div></div>}

                        <button className="btn btn-primary" onClick={nextStep} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {step === 5 ? 'Start Monitoring' : 'Continue'} <ChevronRight size={16} />
                        </button>
                    </div>

                </div>
            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes bounce { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
                @keyframes spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
            `}</style>
        </div>
    );
};

/* Helper Components */
const StepIndicator = ({ current, step, label, icon }: { current: number, step: number, label: string, icon: React.ReactNode }) => {
    const isActive = current === step;
    const isCompleted = current > step;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: isActive || isCompleted ? 1 : 0.5, transition: 'opacity 0.3s' }}>
            <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isActive ? 'var(--accent-cyan)' : isCompleted ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isActive ? '#000' : isCompleted ? 'var(--accent-cyan)' : '#fff',
                transition: 'all 0.3s'
            }}>
                {isCompleted ? <Check size={16} /> : icon}
            </div>
            <div style={{ fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : 'var(--text-secondary)' }}>
                {label}
            </div>
        </div>
    )
}

const FeatureTag = ({ label }: { label: string }) => (
    <div style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: 'var(--text-secondary)' }}>
        {label}
    </div>
)

const PreferenceToggle = ({ label, description, defaultChecked }: { label: string, description: string, defaultChecked: boolean }) => {
    const [checked, setChecked] = useState(defaultChecked);
    return (
        <div
            onClick={() => setChecked(!checked)}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-3)', borderRadius: '8px',
                background: checked ? 'rgba(0, 212, 255, 0.05)' : 'rgba(255,255,255,0.02)',
                border: checked ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer', transition: 'all 0.2s'
            }}
        >
            <div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{description}</div>
            </div>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent-cyan)', background: checked ? 'var(--accent-cyan)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {checked && <div style={{ width: 10, height: 10, background: '#000', borderRadius: '50%' }}></div>}
            </div>
        </div>
    )
}
