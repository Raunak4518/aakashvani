import { Zap, CheckCircle } from 'lucide-react';
import { useDetection } from '../../context/DetectionContext';
import { useEffect, useState } from 'react';
import { SystemAPI, type Metrics } from '../../services/api';

export const LiveMetricsDashboard = () => {
    const { currentConfidence, isConnected, stats } = useDetection();
    const [metrics, setMetrics] = useState<Metrics | null>(null);

    // Fetch system metrics
    useEffect(() => {
        if (!isConnected) return;

        const fetchMetrics = async () => {
            try {
                const res = await SystemAPI.getMetrics();
                setMetrics(res.data);
            } catch (e) {
                console.error("Failed to fetch metrics", e);
            }
        };

        fetchMetrics();
        const interval = setInterval(fetchMetrics, 2000);
        return () => clearInterval(interval);
    }, [isConnected]);

    // Calculate latency from WebRTC stats or fallback to API metrics
    const latency = stats.rtt > 0 ? stats.rtt : (metrics?.latency || 0);
    const latencyStatus = latency < 100 ? 'Good' : latency < 200 ? 'Fair' : 'Poor';
    const latencyColor = latency < 100 ? 'var(--accent-green)' : latency < 200 ? 'var(--accent-orange)' : 'var(--accent-red)';

    // Calculate trend from history
    const confidenceTrend = metrics?.confidence_trend || 0;
    const trendText = confidenceTrend >= 0 ? `+${confidenceTrend.toFixed(0)}%` : `${confidenceTrend.toFixed(0)}%`;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            {/* Confidence */}
            <div className="glass-panel" style={{ padding: 'var(--space-2)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Current Confidence</div>
                <div style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 'bold',
                    color: isConnected ? (currentConfidence >= 70 ? 'var(--accent-green)' : currentConfidence >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)') : 'var(--text-tertiary)',
                    margin: '4px 0'
                }}>
                    {isConnected ? `${currentConfidence.toFixed(0)}%` : '--%'}
                </div>
                <div style={{ fontSize: '10px', color: confidenceTrend >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    {isConnected && <><Zap size={10} /> {trendText} trend</>}
                </div>
            </div>

            {/* Latency */}
            <div className="glass-panel" style={{ padding: 'var(--space-2)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Processing Latency</div>
                <div className="text-mono" style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                    {isConnected ? <>{latency.toFixed(0)}<span style={{ fontSize: '12px' }}>ms</span></> : '--'}
                </div>
                <div style={{ fontSize: '10px', color: latencyColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    {isConnected && <><CheckCircle size={10} /> {latencyStatus}</>}
                </div>
            </div>

            {/* Network Quality */}
            <div className="glass-panel" style={{ padding: 'var(--space-2)', textAlign: 'center' }}>
                <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: `4px solid ${isConnected ? (stats.packetsLost < 10 ? 'var(--accent-cyan)' : 'var(--accent-orange)') : 'var(--text-tertiary)'}`,
                    margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 'bold'
                }}>
                    {isConnected ? (stats.packetsLost < 5 ? '10' : stats.packetsLost < 10 ? '8' : '5') : '-'}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 4 }}>Input Quality</div>
            </div>

            {/* Bytes Received */}
            <div className="glass-panel" style={{ padding: 'var(--space-2)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold' }}>
                    {isConnected ? (stats.bytesReceived / 1024).toFixed(0) : '0'}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>KB Received</div>
                <div style={{ height: 4, width: '80%', background: 'rgba(255,255,255,0.1)', margin: '4px auto', borderRadius: 2 }}>
                    <div style={{
                        height: '100%',
                        width: isConnected ? `${Math.min((stats.bytesReceived / 102400) * 100, 100)}%` : '0%',
                        background: 'var(--accent-cyan)',
                        transition: 'width 0.3s'
                    }}></div>
                </div>
            </div>
        </div>
    );
};
