import { Copy } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { useState } from 'react';

export const SessionInfoPanel = () => {
    const { sessionId, startTime, status } = useSession();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (sessionId) {
            navigator.clipboard.writeText(sessionId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const statusConfig = {
        idle: { color: 'var(--text-secondary)', text: 'Idle', dot: 'gray' },
        connecting: { color: 'var(--accent-cyan)', text: 'Connecting...', dot: 'var(--accent-cyan)' },
        recording: { color: 'var(--accent-green)', text: 'Session Active', dot: 'var(--accent-green)' },
        paused: { color: 'var(--accent-orange)', text: 'Session Paused', dot: 'var(--accent-orange)' },
        error: { color: 'var(--accent-red)', text: 'Error', dot: 'var(--accent-red)' }
    };

    const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig.idle;

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
            <h3 className="text-secondary" style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 'var(--space-3)' }}>
                Session Info
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {/* Session ID */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>ID</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="text-mono" style={{ fontSize: 'var(--text-sm)' }}>
                            {sessionId || 'NO-SESSION'}
                        </span>
                        <Copy
                            size={12}
                            className="text-secondary"
                            style={{ cursor: 'pointer', color: copied ? 'var(--accent-green)' : undefined }}
                            onClick={handleCopy}
                        />
                    </div>
                </div>

                {/* Start Time */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>Started</span>
                    <span style={{ fontSize: 'var(--text-sm)' }}>
                        {startTime ? new Date(startTime).toLocaleTimeString() : '--:--:--'}
                    </span>
                </div>

                {/* Status Badge */}
                <div style={{
                    marginTop: 'var(--space-3)',
                    padding: '6px 12px',
                    background: `rgba(0,0,0,0.2)`,
                    borderRadius: '16px',
                    color: currentStatus.color,
                    fontSize: 'var(--text-xs)',
                    textAlign: 'center',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    border: `1px solid ${currentStatus.color}20`
                }}>
                    <div style={{
                        width: 6,
                        height: 6,
                        background: currentStatus.dot,
                        borderRadius: '50%',
                        animation: status === 'recording' ? 'pulse 2s infinite' : 'none'
                    }}></div>
                    {currentStatus.text}
                </div>
            </div>
        </div>
    );
};
