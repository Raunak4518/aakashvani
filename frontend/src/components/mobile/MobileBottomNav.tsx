import { Home, Clock, Activity, Settings, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

interface MobileBottomNavProps {
    onTabChange?: (tab: string) => void;
    onSettingsClick?: () => void;
    onMoreClick?: () => void;
}

export const MobileBottomNav = ({ onTabChange, onSettingsClick, onMoreClick }: MobileBottomNavProps) => {
    const [activeTab, setActiveTab] = useState('home');

    const handleTabClick = (tab: string, callback?: () => void) => {
        setActiveTab(tab);
        if (onTabChange) onTabChange(tab);
        if (callback) callback();
    };

    const navItems = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'history', icon: Clock, label: 'History' },
        { id: 'metrics', icon: Activity, label: 'Metrics' },
        { id: 'settings', icon: Settings, label: 'Settings', action: onSettingsClick },
        { id: 'more', icon: MoreHorizontal, label: 'More', action: onMoreClick },
    ];

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '64px',
            background: 'rgba(10, 14, 39, 0.85)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'none', // Hidden by default, shown via CSS media query
            alignItems: 'center',
            justifyContent: 'space-around',
            zIndex: 100,
            paddingBottom: 'safe-area-inset-bottom'
        }} className="mobile-nav">
            {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                    <div
                        key={item.id}
                        onClick={() => handleTabClick(item.id, item.action)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            color: isActive ? 'var(--accent-cyan)' : 'var(--text-tertiary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            transform: isActive ? 'scale(1.1)' : 'scale(1)'
                        }}
                    >
                        <item.icon size={20} />
                        <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                    </div>
                );
            })}
            <style>{`
                @media (max-width: 768px) {
                    .mobile-nav { display: flex !important; z-index: 1000; }
                }
            `}</style>
        </div>
    );
};
