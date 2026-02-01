import { useState, Suspense, lazy } from 'react';
import './App.css';
import { MainLayout } from './layouts/MainLayout';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { RightPanel } from './components/RightPanel';
import { MainWorkspace } from './components/MainWorkspace';

// Lazy Loaded Modals
const SettingsModal = lazy(() => import('./components/modals/SettingsModal').then(module => ({ default: module.SettingsModal })));
const DetectionDetailsModal = lazy(() => import('./components/modals/DetectionDetailsModal').then(module => ({ default: module.DetectionDetailsModal })));
const SetupWizard = lazy(() => import('./components/overlays/SetupWizard').then(module => ({ default: module.SetupWizard })));

import { NetworkWarning } from './components/overlays/NetworkWarning';
import { AlertProvider } from './context/AlertContext';
import { ToastContainer } from './components/notifications/ToastContainer';
import { SessionProvider } from './context/SessionContext';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider } from './context/SettingsContext';
import { DetectionProvider } from './context/DetectionContext';

function App() {
  // Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDetectionDetailsOpen, setIsDetectionDetailsOpen] = useState(false);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false); // Default closed for production

  return (
    <SettingsProvider>
      <SessionProvider>
        <NotificationProvider>
          <DetectionProvider>
            <AlertProvider>
              <MainLayout
                header={<Header onSettingsClick={() => setIsSettingsOpen(true)} />}
                sidebar={<LeftSidebar />}
                main={<MainWorkspace />}
                rightPanel={<RightPanel onShowDetails={() => setIsDetectionDetailsOpen(true)} />}
              />

              {/* Global Modals & Overlays */}
              <Suspense fallback={null}>
                {isSettingsOpen && (
                  <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                  />
                )}

                {isDetectionDetailsOpen && (
                  <DetectionDetailsModal
                    isOpen={isDetectionDetailsOpen}
                    onClose={() => setIsDetectionDetailsOpen(false)}
                  />
                )}

                {isSetupWizardOpen && (
                  <SetupWizard
                    isOpen={isSetupWizardOpen}
                    onClose={() => setIsSetupWizardOpen(false)}
                  />
                )}
              </Suspense>

              {/* Network Warning - now uses real data from DetectionContext */}
              <NetworkWarning />

              <ToastContainer />
            </AlertProvider>
          </DetectionProvider>
        </NotificationProvider>
      </SessionProvider>
    </SettingsProvider>
  );
}

export default App;
