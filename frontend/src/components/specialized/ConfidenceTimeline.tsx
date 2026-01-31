import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ConfidenceTimelineProps {
    className?: string;
}

export const ConfidenceTimeline = ({ className }: ConfidenceTimelineProps) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [hoverPoint, setHoverPoint] = useState<{ x: number, y: number, value: number, time: string } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Mock Data: Confidence over time (0-100)
    // Generating a trend that dips into danger then recovers
    const dataPoints = Array.from({ length: 50 }, (_, i) => {
        const time = i;
        let value = 85 + Math.sin(i * 0.2) * 10; // Base oscillation
        if (i > 20 && i < 30) value -= 50; // Dip
        value = Math.max(0, Math.min(100, value + (Math.random() - 0.5) * 5));
        return { time, value };
    });

    const height = isExpanded ? 160 : 40;
    const padding = { top: 20, right: 10, bottom: 20, left: 10 };

    // SVG Helper to scale points
    const getCoordinates = (index: number, value: number, width: number, h: number) => {
        const x = padding.left + (index / (dataPoints.length - 1)) * (width - padding.left - padding.right);
        const effectiveHeight = h - padding.top - padding.bottom;
        const y = padding.top + effectiveHeight - (value / 100) * effectiveHeight;
        return { x, y };
    };

    // Generate Path D string
    const generatePath = (width: number, h: number) => {
        return dataPoints.map((p, i) => {
            const { x, y } = getCoordinates(i, p.value, width, h);
            return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
        }).join(' ');
    };

    // Generate Area fill (closed path)
    const generateArea = (width: number, h: number) => {
        const line = generatePath(width, h);
        const { x: xLast, y: yBottom } = getCoordinates(dataPoints.length - 1, 0, width, h); // Bottom right (y at 0 val)
        const { x: xFirst } = getCoordinates(0, 0, width, h); // Bottom left
        // Note: y for value 0 is at bottom
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
                <svg width="100%" height="100%">
                    <defs>
                        <linearGradient id="confidenceGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent-green)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="var(--accent-green)" stopOpacity="0.0" />
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
                    {containerRef.current && (
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
                                strokeDasharray="1000"
                                strokeDashoffset="1000"
                                style={{ animation: 'pathDraw 1.5s ease-out forwards' }}
                            />

                            {/* Points (Only show on hover or high/low points to save perf?) - Showing all for now with opacity logic */}
                            {dataPoints.map((p, i) => {
                                const { x, y } = getCoordinates(i, p.value, containerRef.current!.clientWidth, height);
                                const isDanger = p.value < 40;
                                return (
                                    <circle
                                        key={i}
                                        cx={x} cy={y}
                                        r={hoverPoint?.time === i.toString() ? 5 : 2}
                                        fill={isDanger ? 'var(--accent-red)' : 'var(--accent-green)'}
                                        stroke={hoverPoint?.time === i.toString() ? '#fff' : 'none'}
                                        style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                                        onMouseEnter={() => setHoverPoint({ x, y, value: p.value, time: i.toString() })}
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
                        left: hoverPoint.x - 30, // Center
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
                        <div style={{ fontWeight: 600, color: hoverPoint.value < 40 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                            {hoverPoint.value.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>T: {hoverPoint.time}s</div>
                    </div>
                )}
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-tertiary)', paddingBottom: 4 }}>
                CONFIDENCE TIMELINE
            </div>
        </div>
    );
};
