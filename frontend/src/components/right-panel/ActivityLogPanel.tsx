import { FileText, Filter } from 'lucide-react';
import { VirtualList } from '../../utils/VirtualList';
import { useEffect, useState } from 'react';
import { SystemAPI, type SystemLog } from '../../services/api';


interface ActivityLogPanelProps {
    onShowDetails?: () => void;
}

export const ActivityLogPanel = ({ onShowDetails }: ActivityLogPanelProps) => {
    const [logs, setLogs] = useState<SystemLog[]>([]);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await SystemAPI.getLogs();
                setLogs(res.data);
            } catch (e) {
                console.error("Fetch logs failed", e);
            }
        };
        // Poll for now (could be websocket later)
        const interval = setInterval(fetchLogs, 3000);
        fetchLogs();
        return () => clearInterval(interval);
    }, []);

    const getColor = (level: string) => {
        switch (level) {
            case 'INFO': return 'var(--accent-cyan)';
            case 'WARN': return 'var(--accent-orange)';
            case 'ERROR': return 'var(--accent-red)';
            case 'SUCCESS': return 'var(--accent-green)';
            default: return 'var(--text-primary)';
        }
    };

    return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <FileText size={16} />
                    <span style={{ fontWeight: 600 }}>Activity Log</span>
                </div>
                <Filter size={14} className="text-secondary" style={{ cursor: 'pointer' }} />
            </div>

            <div className="glass-panel" style={{ flex: 1, overflow: 'hidden' }}>
                <VirtualList
                    items={logs}
                    height={300} // Dynamic height TODO
                    itemHeight={28}
                    className="custom-scrollbar"
                    renderItem={(log, i) => (
                        <div
                            key={i}
                            onClick={log.level === 'ERROR' ? onShowDetails : undefined}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                height: '100%',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                cursor: log.level === 'ERROR' ? 'pointer' : 'default',
                                background: log.level === 'ERROR' ? 'rgba(255,51,102,0.05)' : 'transparent',
                                padding: '0 8px',
                                fontSize: 'var(--text-xs)',
                                fontFamily: 'var(--font-mono)'
                            }}
                        >
                            <span style={{ color: 'var(--text-secondary)', marginRight: 6, width: 60 }}>[{log.timestamp.split(' ')[0]}]</span>
                            <span style={{ color: getColor(log.level), fontWeight: 'bold', marginRight: 6, width: 60 }}>[{log.level}]</span>
                            <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.message}</span>
                        </div>
                    )}
                />
            </div>
        </div>
    );
};
