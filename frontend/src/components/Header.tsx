import { useState, useRef, useEffect } from 'react';
import { Bell, Settings, User, Shield, LogOut, FileText, HelpCircle, X, Check } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { useNotifications, getNotificationIcon } from '../context/NotificationContext';

interface HeaderProps {
    onSettingsClick?: () => void;
}

export const Header = ({ onSettingsClick }: HeaderProps) => {
    const { status, duration, formatTime } = useSession();
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, removeNotification } = useNotifications();

    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // Click outside handler logic could go here (omitted for brevity, handled by simple toggle/backdrop interactions if needed, but simple toggle is fine for MVP)
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format time logic based on spec
    const timeDisplay = formatTime(duration);
    const timerColor = status === 'recording' ? 'var(--text-primary)' : status === 'paused' ? 'var(--accent-orange)' : 'var(--text-secondary)';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '100%',
            padding: '0 var(--space-4)',
            position: 'relative',
        }}>
            {/* Left: Brand / Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }} onClick={() => window.location.reload()}>
                <div style={{
                    filter: 'drop-shadow(0 0 8px rgba(0, 212, 255, 0.4))'
                }}>
                    <Shield size={32} color="var(--accent-cyan)" fill="rgba(0, 212, 255, 0.1)" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                    <span style={{
                        fontSize: 'var(--text-lg)',
                        fontWeight: 700,
                        background: 'linear-gradient(to right, #fff, #ccc)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        VoiceGuard AI
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: 1 }}>REAL-TIME PROTECTION</span>
                </div>
            </div>

            {/* Center: Session Timer */}
            <div className="glass-panel" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: '8px 16px',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}>
                {status === 'recording' ? (
                    <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent-green)',
                        boxShadow: '0 0 8px var(--accent-green)',
                        animation: 'pulse 2s infinite'
                    }}></div>
                ) : status === 'paused' ? (
                    <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent-orange)'
                    }}></div>
                ) : (
                    <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--text-tertiary)'
                    }}></div>
                )}

                <span className="text-mono" style={{ fontSize: 'var(--text-base)', color: timerColor, minWidth: 70, textAlign: 'center' }}>
                    {timeDisplay}
                </span>
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>

                {/* Status Indicator */}
                <div className="glass-panel" style={{ padding: '6px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', animation: 'pulse-glow 2s infinite' }}></div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Online</span>
                </div>

                {/* Notifications */}
                <div ref={notifRef} style={{ position: 'relative' }}>
                    <div
                        onClick={() => setShowNotifications(!showNotifications)}
                        style={{ position: 'relative', cursor: 'pointer', opacity: showNotifications ? 1 : 0.8, transition: 'opacity 0.2s' }}
                    >
                        <Bell size={20} color="var(--text-primary)" />
                        {unreadCount > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                background: 'var(--accent-red)',
                                color: 'white',
                                fontSize: '10px',
                                minWidth: 16,
                                height: 16,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                                fontWeight: 'bold',
                                boxShadow: '0 0 4px var(--accent-red)'
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </div>
                        )}
                    </div>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="glass-panel" style={{
                            position: 'absolute',
                            top: '40px',
                            right: '-80px', // Center align roughly
                            width: '320px',
                            zIndex: 1000,
                            maxHeight: '400px',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 'var(--space-2)',
                            background: 'rgba(10, 14, 39, 0.95)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>Notifications</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span onClick={markAllAsRead} style={{ fontSize: '12px', color: 'var(--accent-cyan)', cursor: 'pointer' }}>Mark all read</span>
                                    <span onClick={clearAll} style={{ fontSize: '12px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>Clear</span>
                                </div>
                            </div>

                            <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                                        No new notifications
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <div key={notif.id} style={{
                                            padding: '12px',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            background: notif.read ? 'transparent' : 'rgba(255,255,255,0.03)',
                                            display: 'flex',
                                            gap: 12,
                                            alignItems: 'start'
                                        }}>
                                            <div style={{ marginTop: 2 }}>{getNotificationIcon(notif.type)}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 2 }}>{notif.message}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                    {Math.floor((Date.now() - notif.timestamp) / 60000)}m ago
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                                            >
                                                <X size={12} color="var(--text-tertiary)" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Settings */}
                <div onClick={onSettingsClick} style={{ cursor: 'pointer', opacity: 0.8 }}>
                    <Settings size={20} color="var(--text-primary)" />
                </div>

                {/* User Profile */}
                <div ref={profileRef} style={{ position: 'relative' }}>
                    <div
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            position: 'relative'
                        }}
                    >
                        <User size={20} color="var(--text-secondary)" />
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 10,
                            height: 10,
                            background: 'var(--accent-green)',
                            borderRadius: '50%',
                            border: '2px solid var(--bg-gradient-start)'
                        }}></div>
                    </div>

                    {/* Profile Menu */}
                    {showProfileMenu && (
                        <div className="glass-panel" style={{
                            position: 'absolute',
                            top: '48px',
                            right: 0,
                            width: '240px',
                            zIndex: 1000,
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 'var(--space-2)',
                            background: 'rgba(10, 14, 39, 0.95)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontWeight: 600 }}>Raunak Singh</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>admin@voiceguard.ai</div>
                            </div>

                            <div style={{ padding: '8px' }}>
                                <div className="menu-item" onClick={onSettingsClick} style={menuItemStyle}>
                                    <Settings size={16} /> Account Settings
                                </div>
                                <div className="menu-item" style={menuItemStyle}>
                                    <FileText size={16} /> Session History
                                </div>
                                <div className="menu-item" style={menuItemStyle}>
                                    <HelpCircle size={16} /> Help & Documentation
                                </div>
                            </div>

                            <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="menu-item" style={{ ...menuItemStyle, color: 'var(--accent-red)' }}>
                                    <LogOut size={16} /> Sign Out
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const menuItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 'var(--text-sm)',
    borderRadius: 4,
    color: 'var(--text-secondary)',
    transition: 'background 0.2s',
} as const;
