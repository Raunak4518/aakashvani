import { ListFilter, CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { useState } from 'react';

// Define the shape of a detection item
export interface DetectionItem {
    id: string;
    timestamp: number;
    status: 'authentic' | 'deepfake' | 'uncertain' | 'analyzing';
    confidence: number;
    duration: number;
    method: 'neural' | 'spectral' | 'prosody' | 'multi';
}

interface DetectionHistoryListProps {
    items?: DetectionItem[]; // Optional for now, will mock if empty
}

export const DetectionHistoryList = ({ items = [] }: DetectionHistoryListProps) => {
    // Mock data if no items provided
    const displayItems = items.length > 0 ? items : [
        { id: '1', timestamp: Date.now() - 100000, status: 'authentic', confidence: 94, duration: 8.3, method: 'multi' },
        { id: '2', timestamp: Date.now() - 500000, status: 'uncertain', confidence: 62, duration: 4.1, method: 'spectral' },
        { id: '3', timestamp: Date.now() - 900000, status: 'deepfake', confidence: 89, duration: 12.5, method: 'neural' }
    ] as DetectionItem[];

    const getConfig = (status: string) => {
        switch (status) {
            case 'authentic': return { color: 'var(--accent-green)', icon: CheckCircle };
            case 'deepfake': return { color: 'var(--accent-red)', icon: XCircle };
            case 'uncertain': return { color: 'var(--accent-orange)', icon: AlertTriangle };
            default: return { color: 'var(--text-secondary)', icon: AlertTriangle }; // analyzing
        }
    };

    return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontWeight: 600 }}>Recent Detections <span className="text-secondary" style={{ fontSize: '12px' }}>({displayItems.length})</span></span>
                <ListFilter size={16} className="text-secondary" style={{ cursor: 'pointer' }} />
            </div>

            <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                paddingRight: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)'
            }} className="custom-scrollbar">
                {displayItems.map((item) => {
                    const config = getConfig(item.status);
                    const Icon = config.icon;
                    return (
                        <div key={item.id} className="glass-panel" style={{
                            padding: 'var(--space-3)',
                            borderLeft: `4px solid ${config.color}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                                <span className="text-mono" style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}>
                                    {new Date(item.timestamp).toLocaleTimeString([], { hour12: false })}
                                </span>
                                <Icon size={14} color={config.color} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, textTransform: 'capitalize' }}>{item.status}</span>
                                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: config.color }}>{item.confidence}%</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 4, background: `${config.color}20`, color: config.color }}>
                                    {item.method}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '10px', color: 'var(--accent-cyan)' }}>
                                    Details <ArrowRight size={10} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
