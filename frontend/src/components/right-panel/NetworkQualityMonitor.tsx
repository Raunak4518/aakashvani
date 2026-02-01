import { Wifi, Signal, AlertTriangle } from 'lucide-react';
import { useDetection } from '../../context/DetectionContext';
import { useEffect, useState } from 'react';

export const NetworkQualityMonitor = () => {
    const { isConnected, stats } = useDetection();
    const [bandwidthHistory, setBandwidthHistory] = useState<number[]>([]);

    // Track bandwidth over time for the chart
    useEffect(() => {
        if (!isConnected) {
            setBandwidthHistory([]);
            return;
        }

        const interval = setInterval(() => {
            setBandwidthHistory(prev => {
                const newHistory = [...prev, stats.bytesReceived];
                if (newHistory.length > 20) return newHistory.slice(-20);
                return newHistory;
            });
        }, 500);

        return () => clearInterval(interval);
    }, [isConnected, stats.bytesReceived]);

    // Calculate bandwidth in kbps (bytes difference over time)
    const calculateBandwidth = () => {
        if (bandwidthHistory.length < 2) return 0;
        const diff = bandwidthHistory[bandwidthHistory.length - 1] - bandwidthHistory[bandwidthHistory.length - 2];
        return Math.max(0, (diff * 8) / 1000 * 2); // bits per 500ms * 2 = kbps
    };

    const bandwidth = calculateBandwidth();

    // Generate SVG path from bandwidth history
    const generatePath = () => {
        if (bandwidthHistory.length < 2) return 'M0,50 L240,50';

        const maxBytes = Math.max(...bandwidthHistory, 1);
        const minBytes = Math.min(...bandwidthHistory);
        const range = maxBytes - minBytes || 1;

        return bandwidthHistory.map((bytes, i) => {
            const x = (i / (bandwidthHistory.length - 1)) * 240;
            const normalized = (bytes - minBytes) / range;
            const y = 55 - normalized * 45;
            return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        }).join(' ') + ' V60 H0 Z';
    };

    // Determine quality based on stats
    const packetLoss = stats.packetsLost;
    const jitter = stats.rtt; // Using RTT as proxy for jitter
    const qualityColor = packetLoss < 5 && jitter < 50 ? 'var(--accent-green)' : packetLoss < 15 ? 'var(--accent-orange)' : 'var(--accent-red)';
    const qualityText = packetLoss < 5 && jitter < 50 ? 'Excellent' : packetLoss < 15 ? 'Good' : 'Poor';

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Wifi size={16} />
                    <span style={{ fontWeight: 600 }}>Network Quality</span>
                </div>
                {isConnected ? (
                    <Signal size={16} color={qualityColor} />
                ) : (
                    <AlertTriangle size={16} color="var(--text-tertiary)" />
                )}
            </div>

            {/* Bandwidth Chart (SVG) */}
            <div style={{ height: 60, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--space-2)', marginBottom: 'var(--space-2)', position: 'relative', overflow: 'hidden' }}>
                {isConnected ? (
                    <svg width="100%" height="100%" viewBox="0 0 240 60" preserveAspectRatio="none">
                        <path
                            d={generatePath()}
                            fill="rgba(0, 212, 255, 0.2)"
                            stroke="var(--accent-cyan)"
                            strokeWidth="2"
                        />
                    </svg>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                        Not connected
                    </div>
                )}
                <div style={{ position: 'absolute', top: 4, right: 4, fontSize: '10px', color: 'var(--accent-cyan)' }}>
                    {isConnected ? `${bandwidth.toFixed(0)} kbps` : '-- kbps'}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Packet Loss</span>
                <span style={{ fontSize: 'var(--text-xs)', color: isConnected ? qualityColor : 'var(--text-tertiary)' }}>
                    {isConnected ? `${packetLoss} pkts (${qualityText})` : '--'}
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>RTT</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                    {isConnected ? `${jitter.toFixed(0)}ms` : '--'}
                </span>
            </div>
        </div>
    );
};
