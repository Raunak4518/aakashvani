import { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export const MobileDrawer = ({ isOpen, onClose, title, children }: MobileDrawerProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const drawerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        setStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const deltaY = e.touches[0].clientY - startY;
        if (deltaY > 0) { // Only allow dragging down
            setCurrentY(deltaY);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (currentY > 100) { // Threshold to close
            onClose();
        }
        setCurrentY(0);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            pointerEvents: 'none' // Let clicks pass through backdrop logic
        }}>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    animation: 'fadeIn 0.3s ease',
                    pointerEvents: 'auto'
                }}
            />

            {/* Sheet */}
            <div
                ref={drawerRef}
                style={{
                    background: 'rgba(10, 14, 39, 0.95)',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '24px 24px 0 0',
                    width: '100%',
                    height: '80vh',
                    padding: '20px',
                    paddingBottom: 'safe-area-inset-bottom',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: `translateY(${currentY}px)`,
                    transition: isDragging ? 'none' : 'transform 0.3s ease',
                    animation: 'slideUp 0.3s ease-out',
                    pointerEvents: 'auto',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
                }}
            >
                {/* Drag Handle */}
                <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                        width: '100%', height: 24, display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
                        cursor: 'grab', touchAction: 'none'
                    }}
                >
                    <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}></div>
                </div>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>{title || 'Details'}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {children}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </div>
    );
};
