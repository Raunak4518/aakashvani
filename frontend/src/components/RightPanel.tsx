import { LiveMetricsDashboard } from './right-panel/LiveMetricsDashboard';
import { NetworkQualityMonitor } from './right-panel/NetworkQualityMonitor';
import { ActivityLogPanel } from './right-panel/ActivityLogPanel';

interface RightPanelProps {
    onShowDetails?: () => void;
}

export const RightPanel = ({ onShowDetails }: RightPanelProps) => {
    return (
        <div style={{ height: '100%', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <LiveMetricsDashboard />
            <NetworkQualityMonitor />
            <ActivityLogPanel onShowDetails={onShowDetails} />
        </div>
    );
};
