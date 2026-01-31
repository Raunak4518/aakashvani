import { X } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    width?: string;
    height?: string;
    footer?: ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children, width = '600px', height = 'auto', footer }: ModalProps) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';

        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            perspective: '1000px'
        }}>
            {/* Backdrop */}
            <div
                onClick={onClose}
                className="animate-fade-in"
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)'
                }}
            />

            {/* Modal Content */}
            <div
                className="glass-panel animate-scale-in"
                style={{
                    position: 'relative',
                    width: width || '600px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                    overflow: 'hidden',
                    background: 'rgba(15, 23, 42, 0.85)' // Darker layout background
                }}
            >
                {/* Header */}
                <div style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold' }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div style={{
                        padding: 'var(--space-4)',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 'var(--space-3)'
                    }}>
                        {footer}
                    </div>
                )}
            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
        </div>,
        document.body
    );
};
