import { SessionInfoPanel } from './left-sidebar/SessionInfoPanel';
import { DetectionHistoryList } from './left-sidebar/DetectionHistoryList';
import { QuickSettingsPanel } from './left-sidebar/QuickSettingsPanel';

export const LeftSidebar = () => {
    return (
        <div style={{ height: '100%', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflow: 'hidden' }}>
            <SessionInfoPanel />
            <DetectionHistoryList />
            <QuickSettingsPanel />
        </div>
    );
};
