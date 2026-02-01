import { ListFilter, CheckCircle, AlertTriangle, XCircle, ArrowRight, Trash2 } from 'lucide-react';
import { useDetection, type StoredDetection } from '../../context/DetectionContext';

// Re-export for compatibility
export type DetectionItem = StoredDetection;

interface DetectionHistoryListProps {
    items?: DetectionItem[];
}

export const DetectionHistoryList = ({ items = [] }: DetectionHistoryListProps) => {
    const { detectionHistory, clearHistory } = useDetection();

    // Use provided items or get from context (localStorage)
    const displayItems = items.length > 0 ? items : detectionHistory;

    const getConfig = (status: string) => {
        switch (status) {
            case 'authentic': return { color: 'var(--accent-green)', icon: CheckCircle };
            case 'deepfake': return { color: 'var(--accent-red)', icon: XCircle };
            case 'uncertain': return { color: 'var(--accent-orange)', icon: AlertTriangle };
            default: return { color: 'var(--text-secondary)', icon: AlertTriangle };
        }
    };

    return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontWeight: 600 }}>
                    Recent Detections
                    <span className="text-secondary" style={{ fontSize: '12px', marginLeft: 4 }}>
                        ({displayItems.length})
                    </span>
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {displayItems.length > 0 && (
                        <Trash2
                            size={14}
                            className="text-secondary"
                            style={{ cursor: 'pointer', opacity: 0.6 }}
                            onClick={clearHistory}
                        />
                    )}
                    <ListFilter size={16} className="text-secondary" style={{ cursor: 'pointer' }} />
                </div>
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
                {displayItems.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px', fontSize: '12px' }}>
                        No detection history yet. Start a session to begin.
                    </div>
                )}

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
                                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 4, background: `${config.color}20`, color: config.color }}>
                                        {item.method}
                                    </span>
                                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)' }}>
                                        {item.duration}s
                                    </span>
                                </div>
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
