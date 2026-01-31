import { Sliders, ChevronDown, Save } from 'lucide-react';
import { useState } from 'react';

export const QuickSettingsPanel = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [sensitivity, setSensitivity] = useState(2); // 0-3
    const [autoAdjust, setAutoAdjust] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);

    const sensitivityLabels = ['Low', 'Medium', 'High', 'Paranoid'];

    const handleSensitivityChange = (val: number) => {
        setSensitivity(val);
        setHasChanges(true);
    };

    const handleAutoAdjustToggle = () => {
        setAutoAdjust(!autoAdjust);
        setHasChanges(true);
    };

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-4)', transition: 'all 0.3s' }}>
            <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: collapsed ? 0 : 'var(--space-3)' }}
                onClick={() => setCollapsed(!collapsed)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Sliders size={16} />
                    <span style={{ fontWeight: 600 }}>Quick Settings</span>
                </div>
                <ChevronDown size={16} className="text-secondary" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
            </div>

            {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', animation: 'slide-down 0.3s' }}>
                    {/* Sensitivity Slider */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Sensitivity</span>
                            <span style={{ fontSize: 'var(--text-xs)', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                {sensitivityLabels[sensitivity]}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="3"
                            step="1"
                            value={sensitivity}
                            onChange={(e) => handleSensitivityChange(parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-cyan)' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Low</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Paranoid</span>
                        </div>
                    </div>

                    {/* Auto-adjust Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Auto-adjust Quality</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>Optimize for network</span>
                        </div>
                        <div
                            onClick={handleAutoAdjustToggle}
                            style={{
                                width: 32,
                                height: 18,
                                background: autoAdjust ? 'var(--accent-green)' : 'gray',
                                borderRadius: 9,
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.3s'
                            }}
                        >
                            <div style={{
                                width: 14,
                                height: 14,
                                background: '#fff',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: 2,
                                left: autoAdjust ? 16 : 2,
                                transition: 'left 0.3s'
                            }}></div>
                        </div>
                    </div>

                    {/* Apply Button */}
                    <button
                        className="btn"
                        disabled={!hasChanges}
                        style={{
                            width: '100%',
                            marginTop: 'var(--space-1)',
                            background: hasChanges ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                            color: hasChanges ? 'black' : 'var(--text-secondary)',
                            cursor: hasChanges ? 'pointer' : 'not-allowed',
                            opacity: hasChanges ? 1 : 0.5
                        }}
                        onClick={() => { setHasChanges(false); /* Logic to apply */ }}
                    >
                        {hasChanges ? 'Apply Settings' : 'No Changes'}
                    </button>
                </div>
            )}
        </div>
    );
};
