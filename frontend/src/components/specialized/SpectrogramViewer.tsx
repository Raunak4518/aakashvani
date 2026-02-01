import { useRef, useEffect, useState } from 'react';
import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useDetection } from '../../context/DetectionContext';

interface SpectrogramViewerProps {
    height?: number;
    className?: string;
}

export const SpectrogramViewer = ({ height = 200, className }: SpectrogramViewerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, time: number, freq: number, amp: number } | null>(null);
    const [zoom, setZoom] = useState(1);

    const { audioContext, audioStream, isConnected, isDeepfake, currentConfidence } = useDetection();
    const analyserRef = useRef<AnalyserNode | null>(null);
    const spectrogramDataRef = useRef<Uint8Array[]>([]);
    const animationRef = useRef<number | null>(null);

    // Setup audio analyzer and draw spectrogram
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and setup initial state
        if (!isConnected || !audioContext || !audioStream) {
            ctx.fillStyle = 'rgba(10, 14, 39, 1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Start recording to see spectrogram', canvas.width / 2, canvas.height / 2);
            spectrogramDataRef.current = [];
            return;
        }

        try {
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;

            const source = audioContext.createMediaStreamSource(audioStream);
            source.connect(analyser);
            analyserRef.current = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const drawSpectrogram = () => {
                if (!analyserRef.current || !ctx) return;

                analyserRef.current.getByteFrequencyData(dataArray);

                // Store data for scrolling effect
                spectrogramDataRef.current.push(new Uint8Array(dataArray));
                if (spectrogramDataRef.current.length > canvas.width) {
                    spectrogramDataRef.current.shift();
                }

                // Clear canvas
                ctx.fillStyle = 'rgba(10, 14, 39, 0.1)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw spectrogram from stored data
                const sliceWidth = 1;
                spectrogramDataRef.current.forEach((data, timeIndex) => {
                    const x = timeIndex * sliceWidth;

                    for (let i = 0; i < data.length; i++) {
                        const value = data[i];
                        const y = canvas.height - (i / data.length) * canvas.height;
                        const barHeight = canvas.height / data.length;

                        // Color based on intensity and detection status
                        const intensity = value / 255;
                        let r, g, b;

                        if (isDeepfake || currentConfidence < 40) {
                            // Red-orange for deepfake
                            r = Math.floor(255 * intensity);
                            g = Math.floor(51 * intensity);
                            b = Math.floor(102 * intensity);
                        } else if (currentConfidence < 70) {
                            // Orange-yellow for uncertain
                            r = Math.floor(255 * intensity);
                            g = Math.floor(180 * intensity);
                            b = Math.floor(0);
                        } else {
                            // Cyan-green gradient for authentic
                            r = Math.floor(0);
                            g = Math.floor(200 * intensity + 55);
                            b = Math.floor(255 * intensity);
                        }

                        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.5 + intensity * 0.5})`;
                        ctx.fillRect(x, y, sliceWidth, barHeight);
                    }
                });

                // Draw frequency axis labels
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.font = '10px monospace';
                ctx.textAlign = 'right';
                ctx.fillText('8kHz', 35, 20);
                ctx.fillText('4kHz', 35, canvas.height / 2);
                ctx.fillText('0Hz', 35, canvas.height - 5);

                animationRef.current = requestAnimationFrame(drawSpectrogram);
            };

            drawSpectrogram();

            return () => {
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
                source.disconnect();
            };
        } catch (e) {
            console.error("Failed to setup spectrogram:", e);
        }
    }, [audioContext, audioStream, isConnected, isDeepfake, currentConfidence]);

    // Handle canvas resize
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const resizeCanvas = () => {
            canvas.width = container.clientWidth;
            canvas.height = height - 40;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [height]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const time = (x / canvas.width) * (spectrogramDataRef.current.length / 30); // Approximate seconds
        const freq = ((canvas.height - y) / canvas.height) * 8000; // 0-8kHz

        // Get amplitude from stored data
        const timeIndex = Math.floor((x / canvas.width) * spectrogramDataRef.current.length);
        const freqIndex = Math.floor(((canvas.height - y) / canvas.height) * 128);
        const amp = spectrogramDataRef.current[timeIndex]?.[freqIndex] || 0;

        setHoverInfo({ x, y, time, freq: Math.round(freq), amp });
    };

    const handleExport = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const link = document.createElement('a');
        link.download = `spectrogram-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    return (
        <div className={`glass-panel ${className}`} style={{ padding: 'var(--space-3)', position: 'relative' }} ref={containerRef}>
            {/* Header / Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Spectrogram</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                        {isConnected ? 'LIVE' : 'IDLE'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    <button className="btn btn-glass" style={{ padding: 6 }} onClick={() => setZoom(z => Math.min(z + 0.5, 3))}>
                        <ZoomIn size={14} />
                    </button>
                    <button className="btn btn-glass" style={{ padding: 6 }} onClick={() => setZoom(z => Math.max(z - 0.5, 0.5))}>
                        <ZoomOut size={14} />
                    </button>
                    <button className="btn btn-glass" style={{ padding: 6 }} onClick={() => { setZoom(1); spectrogramDataRef.current = []; }}>
                        <RotateCcw size={14} />
                    </button>
                    <button className="btn btn-glass" style={{ padding: 6 }} onClick={handleExport}>
                        <Download size={14} />
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', transform: `scaleX(${zoom})`, transformOrigin: 'left' }}>
                <canvas
                    ref={canvasRef}
                    style={{ display: 'block', width: '100%', height: height - 40, background: 'rgba(10, 14, 39, 1)' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoverInfo(null)}
                />

                {/* Hover Tooltip */}
                {hoverInfo && isConnected && (
                    <div style={{
                        position: 'absolute',
                        left: Math.min(hoverInfo.x + 10, (containerRef.current?.clientWidth || 300) - 120),
                        top: hoverInfo.y - 60,
                        background: 'rgba(10, 14, 39, 0.95)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        padding: '6px 10px',
                        borderRadius: 4,
                        fontSize: '10px',
                        pointerEvents: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        fontFamily: 'monospace'
                    }}>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Time:</span> {hoverInfo.time.toFixed(2)}s</div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Freq:</span> {hoverInfo.freq}Hz</div>
                        <div><span style={{ color: 'var(--text-secondary)' }}>Amp:</span> {((hoverInfo.amp / 255) * 100).toFixed(0)}%</div>
                    </div>
                )}
            </div>
        </div>
    );
};
