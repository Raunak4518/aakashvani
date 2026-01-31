import { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
    isRecording: boolean;
    getFrequencyData: (data: Uint8Array) => void;
    height?: number;
}

export const WaveformVisualizer = ({ isRecording, getFrequencyData, height = 300 }: WaveformVisualizerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Setup buffer based on FFT size (half of 256 normally)
        const bufferLength = 128;
        const dataArray = new Uint8Array(bufferLength);

        // Logical Size vs Display Size (Retina/HighDPI fix)
        // We'll trust the parent to size the container, but we need internal resolution
        const dpr = window.devicePixelRatio || 1;
        // Wait for layout to settle or just use a fixed high res for now? 
        // Let's rely on resize observer or similar if we want responsiveness, 
        // but for now, simple responsive width logic inside render loop.

        const render = () => {
            // Check canvas dimensions in DOM
            const { width, height } = canvas.getBoundingClientRect();
            // Update internal resolution if needed
            if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                ctx.scale(dpr, dpr);
            }

            // Clear
            ctx.clearRect(0, 0, width, height);

            // Get Data
            if (isRecording) {
                getFrequencyData(dataArray);
            } else {
                // Decay or silence
                dataArray.fill(0);
            }

            // Draw
            // We want ~60-80 bars suitable for desktop
            const barCount = 60;
            const barWidth = width / barCount;
            const gap = 2;
            const effectiveBarWidth = barWidth - gap;

            // Gradient
            const gradient = ctx.createLinearGradient(0, height, 0, 0);
            if (isRecording) {
                gradient.addColorStop(0, '#00d4ff'); // Cyan bottom
                gradient.addColorStop(1, '#00ff88'); // Green top (active)
            } else {
                gradient.addColorStop(0, '#334155');
                gradient.addColorStop(1, '#475569'); // Gray idle
            }

            ctx.fillStyle = gradient;

            // Draw Frequency Bars
            // dataArray length is 128. We want to map this to barCount (60).
            // Simple step sampling
            const step = Math.floor(bufferLength / barCount);

            for (let i = 0; i < barCount; i++) {
                // Get value from frequency data
                // We could average the step range for better quality
                let value = dataArray[i * step];

                // Add some mock jitter if recording but silence (so it looks alive)
                if (isRecording && value < 5) value = Math.random() * 5 + 2;

                // Normalize 0-255 to 0-height
                const percent = value / 255;
                const barHeight = Math.max(percent * height * 0.8, 4); // Min height 4px

                const x = i * barWidth;
                const y = height - barHeight;

                // Rounded top
                ctx.beginPath();
                ctx.roundRect(x, y, effectiveBarWidth, barHeight, [4, 4, 0, 0]);
                ctx.fill();

                // Reflection/Glow (optional, keep simple for perf first)
            }

            animationRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isRecording, getFrequencyData]);

    return (
        <div style={{ width: '100%', height, position: 'relative', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', overflow: 'hidden' }}>
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', display: 'block' }}
            />

            {/* Overlay Grid lines / Labels could go here */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>
        </div>
    );
};
