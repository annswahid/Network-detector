import { useEffect, useRef } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const HeatMap = ({ cpu = 0, memory = 0 }) => {
    const canvasRef = useRef(null);
    const intensityRef = useRef(0.3);

    useEffect(() => {
        const cpuFactor = clamp(cpu / 100, 0, 1);
        const memFactor = clamp(memory / 100, 0, 1);
        intensityRef.current = clamp((cpuFactor * 0.7 + memFactor * 0.3), 0.1, 1);
    }, [cpu, memory]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let lastFrameTime = 0;

        const draw = () => {
            const now = performance.now();
            if (document.hidden) {
                animationFrameId = requestAnimationFrame(draw);
                return;
            }
            if (now - lastFrameTime < 50) {
                animationFrameId = requestAnimationFrame(draw);
                return;
            }
            lastFrameTime = now;

            const width = canvas.width;
            const height = canvas.height;

            // Create a simple animated gradient effect to simulate a heat map
            const time = Date.now() * 0.001;
            const intensity = intensityRef.current;

            for (let x = 0; x < width; x += 30) {
                for (let y = 0; y < height; y += 30) {
                    const value = Math.sin(x * 0.01 + time) * Math.cos(y * 0.01 + time);
                    const normalizedValue = (value + 1) / 2; // Normalize to 0-1

                    // Create gradient from cyan to purple to pink
                    const r = Math.floor((normalizedValue * 236 + (1 - normalizedValue) * 0) * (0.5 + intensity * 0.5));
                    const g = Math.floor((normalizedValue * 72 + (1 - normalizedValue) * 217) * (0.5 + intensity * 0.5));
                    const b = Math.floor((normalizedValue * 153 + (1 - normalizedValue) * 255) * (0.5 + intensity * 0.5));

                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.25 + normalizedValue * 0.35 * intensity})`;
                    ctx.fillRect(x, y, 29, 29);
                }
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = 300;

        draw();

        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div style={{ width: '100%', height: '300px', overflow: 'hidden', borderRadius: '0.5rem' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default HeatMap;
