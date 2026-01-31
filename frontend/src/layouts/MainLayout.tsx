import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import './MainLayout.css';
import { MobileBottomNav } from '../components/mobile/MobileBottomNav';
import { FloatingActionButton } from '../components/mobile/FloatingActionButton';
import { MobileDrawer } from '../components/mobile/MobileDrawer';

interface MainLayoutProps {
    header: ReactNode;
    sidebar: ReactNode;
    main: ReactNode;
    rightPanel: ReactNode;
}

// Simple hook to detect mobile
const useMobile = () => {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    return isMobile;
};

export const MainLayout = ({ header, sidebar, main, rightPanel }: MainLayoutProps) => {
    const isMobile = useMobile();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerContent, setDrawerContent] = useState<'metrics' | 'more'>('metrics');

    const handleMobileMenuClick = () => {
        setDrawerContent('more');
        setIsDrawerOpen(true);
    };

    const handleMetricsClick = () => {
        setDrawerContent('metrics');
        setIsDrawerOpen(true);
    };

    return (
        <div className="app-container">
            {/* Header */}
            <header
                className="layout-header glass-panel"
                style={{
                    borderRadius: 0,
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    zIndex: 50,
                    position: 'relative'
                }}
            >
                {header}
            </header>

            {/* Sidebar - CSS handles display:none on mobile, but we conditionally render for cleaner DOM */}
            {!isMobile && (
                <aside
                    className="layout-sidebar glass-panel animate-slide-up"
                    style={{
                        margin: 'var(--space-2)',
                        borderRadius: 'var(--space-3)',
                        animationDelay: '0.1s',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        maxHeight: '100%'
                    }}
                >
                    {sidebar}
                </aside>
            )}

            {/* Main Content */}
            <main
                className="layout-main animate-fade-in"
                style={{
                    padding: 'var(--space-3)',
                    overflowY: 'auto'
                }}
            >
                {main}
            </main>

            {/* Right Panel - Hidden on Mobile */}
            {!isMobile && (
                <aside
                    className="layout-right-panel glass-panel animate-slide-up"
                    style={{
                        margin: 'var(--space-2)',
                        borderRadius: 'var(--space-3)',
                        animationDelay: '0.2s'
                    }}
                >
                    {rightPanel}
                </aside>
            )}

            {/* Mobile Elements */}
            {isMobile && (
                <>
                    <FloatingActionButton />
                    <MobileBottomNav
                        onMoreClick={handleMobileMenuClick}
                        onTabChange={(tab) => {
                            if (tab === 'metrics') handleMetricsClick();
                        }}
                    />
                    <MobileDrawer
                        isOpen={isDrawerOpen}
                        onClose={() => setIsDrawerOpen(false)}
                        title={drawerContent === 'metrics' ? 'Live Metrics' : 'Menu'}
                    >
                        {drawerContent === 'metrics' ? rightPanel : (
                            <div style={{ padding: 20, color: 'var(--text-secondary)' }}>
                                <p>Additional settings and tools</p>
                            </div>
                        )}
                    </MobileDrawer>
                </>
            )}
        </div>
    );
};
