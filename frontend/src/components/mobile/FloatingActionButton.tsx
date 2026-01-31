import { Mic, Square } from 'lucide-react';
import { useState } from 'react';

export const FloatingActionButton = () => {
    const [isRecording, setIsRecording] = useState(false);

    return (
        <button
            className="fab"
            onClick={() => setIsRecording(!isRecording)}
            style={{
                position: 'fixed',
                bottom: '80px', // Above nav bar
                right: '20px',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: isRecording ? 'var(--accent-red)' : 'var(--accent-cyan)',
                border: 'none',
                boxShadow: isRecording
                    ? '0 0 20px rgba(255, 51, 102, 0.6)'
                    : '0 0 20px rgba(0, 212, 255, 0.4)',
                display: 'none', // Hidden by default
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                zIndex: 1001
            }}
        >
            {isRecording ? <Square size={24} fill="white" /> : <Mic size={24} />}

            {/* Pulse effect */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, width: '100%', height: '100%',
                borderRadius: '50%',
                border: '1px solid white',
                opacity: 0,
                animation: isRecording ? 'fabPulse 1.5s infinite' : 'none'
            }}></div>

            <style>{`
                @media (max-width: 768px) {
                    .fab { display: flex !important; }
                }
                @keyframes fabPulse {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
            `}</style>
        </button>
    );
};
