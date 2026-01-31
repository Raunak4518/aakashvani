import { useRef, useEffect, useState } from 'react';
import { Maximize2, Download, ZoomIn } from 'lucide-react';

interface SpectrogramViewerProps {
    className?: string;
    height?: number;
}

export const SpectrogramViewer = ({ height = 240 }: SpectrogramViewerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, freq: string, amp: string, time: string } | null>(null);

    // Zoom/Brushing State
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState<number | null>(null);
    const [selectionRect, setSelectionRect] = useState<{ x: number, width: number } | null>(null);

    // Simulated Anomalies
    const anomalies = [
        { start: 0.15, end: 0.25, type: 'Neural Artifact', color: 'rgba(139, 92, 246, 0.3)', border: 'rgba(139, 92, 246, 0.8)' },
        { start: 0.6, end: 0.65, type: 'Glitch', color: 'rgba(255, 51, 102, 0.3)', border: 'rgba(255, 51, 102, 0.8)' },
    ];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match container width
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                canvas.width = entry.contentRect.width;
                canvas.height = height;
                drawSpectrogram(ctx, canvas.width, canvas.height);
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [height]);

    const drawSpectrogram = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.clearRect(0, 0, width, height);

        // Create imageData for direct pixel manipulation (performance)
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                // Map y to frequency (0 at bottom, high at top)
                // In canvas, y=0 is top. So we invert.
                const normalizedFreq = 1 - (y / height); // 0 to 1

                // Simulate some structured noise/patterns
                const timeFactor = Math.sin(x * 0.05) * 0.5 + 0.5;
                const freqFactor = Math.exp(-normalizedFreq * 5); // Falloff at high freqs

                // Add "voice" harmonics
                let value = freqFactor * 0.3;
                if (Math.abs(normalizedFreq - 0.2) < 0.02) value += 0.5 * timeFactor; // Formant 1
                if (Math.abs(normalizedFreq - 0.4) < 0.02) value += 0.3 * timeFactor; // Formant 2

                // Random noise
                value += Math.random() * 0.1;

                // Color Map: Low (Blue) -> Med (Green/Yellow) -> High (Red/White)
                const [r, g, b] = getColor(value);

                const index = (y * width + x) * 4;
                data[index] = r;     // R
                data[index + 1] = g; // G
                data[index + 2] = b; // B
                data[index + 3] = 255; // Alpha
            }
        }
        ctx.putImageData(imgData, 0, 0);
    };

    const getColor = (intensity: number): [number, number, number] => {
        // Simple heatmap gradient logic
        // 0.0 - 0.33: Blue -> Cyan
        // 0.33 - 0.66: Cyan -> Yellow
        // 0.66 - 1.0: Yellow -> Red -> White

        const val = Math.max(0, Math.min(1, intensity));

        if (val < 0.33) {
            const t = val / 0.33;
            return [0, Math.floor(255 * t), Math.floor(255 * (1 - t * 0.5) + 100)];
        } else if (val < 0.66) {
            const t = (val - 0.33) / 0.33;
            return [Math.floor(255 * t), 255, Math.floor(255 * (1 - t))];
        } else {
            const t = (val - 0.66) / 0.34;
            // Yellow (255, 255, 0) -> Red (255, 0, 0)
            return [255, Math.floor(255 * (1 - t)), Math.floor(255 * t)];
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        setIsSelecting(true);
        setSelectionStart(x);
        setSelectionRect({ x, width: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate values provided in requirements
        // Time: 0-10s
        // Freq: 0-16kHz
        const relX = x / rect.width;
        const relY = 1 - (y / rect.height); // Invert y

        setHoverInfo({
            x, y,
            time: (relX * 10).toFixed(2) + 's',
            freq: (relY * 16).toFixed(1) + 'kHz',
            amp: '-' + Math.floor(Math.random() * 60 + 20) + 'dB'
        });

        // Selection Logic
        if (isSelecting && selectionStart !== null) {
            const width = x - selectionStart;
            setSelectionRect({
                x: width > 0 ? selectionStart : x,
                width: Math.abs(width)
            });
        }
    };

    const handleMouseUp = () => {
        setIsSelecting(false);
        setSelectionStart(null);
        // Keep selection rect for visual feedback, or auto-zoom (mock)
        // For now, we'll clear it after a delay to simulate action
        if (selectionRect && selectionRect.width > 10) {
            console.log("Zooming into region:", selectionRect);
            // In a real app, this would trigger a zoom. Here we just fade it out.
            setTimeout(() => setSelectionRect(null), 1000);
        } else {
            setSelectionRect(null);
        }
    };

    const handleMouseLeave = () => {
        setHoverInfo(null);
        if (isSelecting) {
            setIsSelecting(false);
            setSelectionStart(null);
            setSelectionRect(null);
        }
    };

    const handleExport = () => {
        if (!canvasRef.current) return;
        const url = canvasRef.current.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `spectrogram-${Date.now()}.png`;
        link.href = url;
        link.click();
    };

    return (
        <div
            ref={containerRef}
            className="glass-panel"
            style={{
                width: '100%',
                height: height + 40, // + header
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div style={{
                height: 40,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                background: 'rgba(0,0,0,0.2)'
            }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>SPECTROGRAM ANALYSIS</span>
                    <span style={{ fontSize: '10px', color: 'var(--accent-cyan)', background: 'rgba(0, 212, 255, 0.1)', padding: '2px 6px', borderRadius: 4 }}>16kHz</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <ZoomIn size={14} className="text-secondary hover:text-white cursor-pointer" />
                    <Download size={14} className="text-secondary hover:text-white cursor-pointer" onClick={handleExport} />
                    <Maximize2 size={14} className="text-secondary hover:text-white cursor-pointer" />
                </div>
            </div>

            {/* Content */}
            <div
                style={{ flex: 1, position: 'relative', cursor: 'crosshair', userSelect: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            >
                <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

                {/* Anomaly Overlays */}
                {anomalies.map((a, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${a.start * 100}%`,
                        width: `${(a.end - a.start) * 100}%`,
                        background: a.color,
                        borderLeft: `1px solid ${a.border}`,
                        borderRight: `1px solid ${a.border}`,
                        pointerEvents: 'none' // Let mouse pass through to canvas
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: a.border,
                            color: '#fff',
                            fontSize: '9px',
                            padding: '2px 4px',
                            whiteSpace: 'nowrap',
                            borderRadius: '0 0 4px 4px',
                            animation: 'pulse-glow 2s infinite'
                        }}>
                            {a.type}
                        </div>
                    </div>
                ))}

                {/* Selection Overlay */}
                {selectionRect && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        height: '100%',
                        left: selectionRect.x,
                        width: selectionRect.width,
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        pointerEvents: 'none'
                    }}>
                        <div style={{ position: 'absolute', top: 4, right: 4, fontSize: '10px', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: 2 }}>
                            {(selectionRect.width / containerRef.current!.clientWidth * 10).toFixed(2)}s
                        </div>
                    </div>
                )}

                {/* Hover Tooltip */}
                {hoverInfo && !isSelecting && (
                    <div style={{
                        position: 'absolute',
                        left: hoverInfo.x + 15,
                        top: hoverInfo.y + 15,
                        background: 'rgba(10, 14, 39, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 4,
                        padding: 8,
                        pointerEvents: 'none',
                        zIndex: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>T: <span style={{ color: '#fff' }}>{hoverInfo.time}</span></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>F: <span style={{ color: 'var(--accent-cyan)' }}>{hoverInfo.freq}</span></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>A: <span style={{ color: 'var(--accent-green)' }}>{hoverInfo.amp}</span></div>
                    </div>
                )}
            </div>

            {/* Axis Labels */}
            <div style={{ height: 20, display: 'flex', justifyContent: 'space-between', padding: '0 8px', fontSize: '10px', color: 'var(--text-tertiary)', background: 'rgba(0,0,0,0.3)' }}>
                <span>0s</span>
                <span>2s</span>
                <span>4s</span>
                <span>6s</span>
                <span>8s</span>
                <span>10s</span>
            </div>
        </div>
    );
};
