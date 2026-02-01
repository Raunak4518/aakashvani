import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useDetection } from '../../context/DetectionContext';

interface ConfidenceTimelineProps {
    className?: string;
}

export const ConfidenceTimeline = ({ className }: ConfidenceTimelineProps) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [hoverPoint, setHoverPoint] = useState<{ x: number, y: number, value: number, time: string } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Use real data from DetectionContext
    const { history, isConnected } = useDetection();

    // Transform history data for visualization (use last 50 points)
    const dataPoints = history.length > 0
        ? history.slice(-50).map((h, _i) => ({ time: h.time, value: h.value, isDeepfake: h.isDeepfake }))
        : [];

    const height = isExpanded ? 160 : 40;
    const padding = { top: 20, right: 10, bottom: 20, left: 10 };

    // SVG Helper to scale points
    const getCoordinates = (index: number, value: number, width: number, h: number) => {
        const x = padding.left + (index / Math.max(dataPoints.length - 1, 1)) * (width - padding.left - padding.right);
        const effectiveHeight = h - padding.top - padding.bottom;
        const y = padding.top + effectiveHeight - (value / 100) * effectiveHeight;
        return { x, y };
    };

    // Generate Path D string
    const generatePath = (width: number, h: number) => {
        if (dataPoints.length === 0) return '';
        return dataPoints.map((p, i) => {
            const { x, y } = getCoordinates(i, p.value, width, h);
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ');
    };

    // Generate Area fill (closed path)
    const generateArea = (width: number, h: number) => {
        if (dataPoints.length === 0) return '';
        const line = generatePath(width, h);
        const { x: xLast } = getCoordinates(dataPoints.length - 1, 0, width, h);
        const { x: xFirst } = getCoordinates(0, 0, width, h);
        const bottomY = h - padding.bottom;
        return `${line} L ${xLast},${bottomY} L ${xFirst},${bottomY} Z`;
    };

    return (
        <div className={`glass-panel ${className}`} style={{ width: '100%', transition: 'height 0.3s ease' }}>
            {/* Header / Toggle */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    background: 'rgba(0,0,0,0.2)'
                }}
            >
                {isExpanded ? <ChevronDown size={14} className="text-secondary" /> : <ChevronUp size={14} className="text-secondary" />}
            </div>

            <div style={{ position: 'relative', height: height, width: '100%', overflow: 'hidden' }} ref={containerRef}>
                {/* No data message */}
                {dataPoints.length === 0 && (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-tertiary)', fontSize: '12px'
                    }}>
                        {isConnected ? 'Collecting data...' : 'Start recording to see confidence timeline'}
                    </div>
                )}

                <svg width="100%" height="100%">
                    <defs>
                        <linearGradient id="confidenceGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent-green)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--accent-green)" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="dangerGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent-red)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--accent-red)" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                    {/* Background Zones */}
                    {isExpanded && (
                        <>
                            {/* Green Zone (70-100%) */}
                            <rect x="0" y={padding.top} width="100%" height={(height - padding.top - padding.bottom) * 0.3} fill="rgba(0, 255, 136, 0.05)" />
                            {/* Yellow Zone (40-70%) */}
                            <rect x="0" y={padding.top + (height - padding.top - padding.bottom) * 0.3} width="100%" height={(height - padding.top - padding.bottom) * 0.3} fill="rgba(255, 204, 0, 0.05)" />
                            {/* Red Zone (0-40%) */}
                            <rect x="0" y={padding.top + (height - padding.top - padding.bottom) * 0.6} width="100%" height={(height - padding.top - padding.bottom) * 0.4} fill="rgba(255, 51, 102, 0.05)" />
                        </>
                    )}

                    {/* Chart Line & Area */}
                    {containerRef.current && dataPoints.length > 0 && (
                        <>
                            <path
                                d={generateArea(containerRef.current.clientWidth, height)}
                                fill="url(#confidenceGradient)"
                                className="animate-fade-in"
                                style={{ animationDelay: '0.2s' }}
                            />
                            <path
                                d={generatePath(containerRef.current.clientWidth, height)}
                                fill="none"
                                stroke="var(--accent-green)"
                                strokeWidth="2"
                            />

                            {/* Points */}
                            {dataPoints.map((p, i) => {
                                const { x, y } = getCoordinates(i, p.value, containerRef.current!.clientWidth, height);
                                const isDanger = p.isDeepfake || p.value < 40;
                                return (
                                    <circle
                                        key={i}
                                        cx={x} cy={y}
                                        r={hoverPoint?.time === p.time.toFixed(1) ? 5 : 2}
                                        fill={isDanger ? 'var(--accent-red)' : 'var(--accent-green)'}
                                        stroke={hoverPoint?.time === p.time.toFixed(1) ? '#fff' : 'none'}
                                        style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                                        onMouseEnter={() => setHoverPoint({ x, y, value: p.value, time: p.time.toFixed(1) })}
                                        onMouseLeave={() => setHoverPoint(null)}
                                    />
                                );
                            })}
                        </>
                    )}
                </svg>

                {/* Hover Tooltip */}
                {hoverPoint && (
                    <div style={{
                        position: 'absolute',
                        left: hoverPoint.x - 30,
                        top: hoverPoint.y - 40,
                        background: 'rgba(10, 14, 39, 0.95)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: '11px',
                        pointerEvents: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontWeight: 600, color: parseFloat(hoverPoint.value.toString()) < 40 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                            {hoverPoint.value.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>T: {hoverPoint.time}s</div>
                    </div>
                )}
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-tertiary)', paddingBottom: 4 }}>
                CONFIDENCE TIMELINE {dataPoints.length > 0 && `(${dataPoints.length} points)`}
            </div>
        </div>
    );
};
