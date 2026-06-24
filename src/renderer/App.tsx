import { useState, useEffect, lazy, Suspense, type ComponentType } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlassPanel } from './components/layout/GlassPanel';
import { AuthScreen } from './components/common/AuthScreen';
import { useSimConnect } from './hooks/useSimConnect';
import { useLOD } from './hooks/useLOD';
import './App.css';

/* ── Lazy page imports — resilient to missing files ─────── */
function safeLazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch(() => ({
      default: (() => (
        <div className="coming-soon">
          <div className="coming-soon__icon">🚧</div>
          <h2 className="coming-soon__title">Loading…</h2>
          <p className="coming-soon__subtitle">This module is being built by another agent. Restart to pick it up.</p>
        </div>
      )) as unknown as T,
    })),
  );
}

const DashboardPage = safeLazy(() => import('./pages/DashboardPage'));
const LODPage       = safeLazy(() => import('./pages/LODPage'));
const CockpitPage   = safeLazy(() => import('./pages/CockpitPage'));
const CareerPage    = safeLazy(() => import('./pages/CareerPage'));
const SettingsPage  = safeLazy(() => import('./components/settings/SettingsPage'));

/* ── Loading spinner ────────────────────────────────────── */
function PageSpinner() {
  return (
    <div className="page-spinner">
      <div className="page-spinner__ring" />
    </div>
  );
}

/* ── Page transition key helper ─────────────────────────── */
type PageId = 'dashboard' | 'lod-engine' | 'cockpit' | 'career' | 'settings';

export function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [updateStatus, setUpdateStatus] = useState<any>(null);

  const { telemetry, isConnected: simConnected } = useSimConnect();
  const { lodState } = useLOD();

  useEffect(() => {
    const api = (window as any).aerosphere;
    if (!api) {
      setAuthLoading(false);
      return;
    }

    api.getAuthState().then((state: any) => {
      setUser(state?.user || null);
      setAuthLoading(false);
    });

    const unsubscribe = api.onAuthState((state: any) => {
      setUser(state?.user || null);
      setAuthLoading(false);
    });

    const handleUpdateStatus = (statusData: any) => {
      console.log('[Renderer] Auto-updater status received:', statusData);
      setUpdateStatus(statusData);
    };

    if (api.on) {
      api.on('update:status', handleUpdateStatus);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (api.off) {
        api.off('update:status', handleUpdateStatus);
      }
    };
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onNavigate={(p: string) => setActivePage(p as PageId)} />;
      case 'lod-engine':
        return <LODPage />;
      case 'cockpit':
        return <CockpitPage />;
      case 'career':
        return <CareerPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={(p: string) => setActivePage(p as PageId)} />;
    }
  };

  if (authLoading) {
    return <PageSpinner />;
  }

  if (!user) {
    return <AuthScreen onSuccess={() => {}} />;
  }

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} onNavigate={(p) => setActivePage(p as PageId)} />
      <main className="app-main">
        <Header 
          simConnected={simConnected} 
          fps={lodState.currentFPS ?? 0} 
          altitude={telemetry.altitude ?? 0} 
        />
        <div className="app-content">
          <Suspense fallback={<PageSpinner />}>
            <div className="page-transition" key={activePage}>
              {renderPage()}
            </div>
          </Suspense>
        </div>
      </main>

      {/* Glassmorphic Toast Notification for Updates */}
      {updateStatus && updateStatus.status !== 'not-available' && (
        <div className={`update-toast update-toast--${updateStatus.status}`}>
          <div className="update-toast__blur" />
          <div className="update-toast__content">
            <span className="update-toast__icon">
              {updateStatus.status === 'checking' && '🔄'}
              {updateStatus.status === 'available' && '📥'}
              {updateStatus.status === 'downloaded' && '✨'}
              {updateStatus.status === 'error' && '⚠️'}
            </span>
            <div className="update-toast__text">
              <div className="update-toast__title">
                {updateStatus.status === 'checking' && 'Checking for updates...'}
                {updateStatus.status === 'available' && `New update available: v${updateStatus.version}`}
                {updateStatus.status === 'downloaded' && 'Update downloaded!'}
                {updateStatus.status === 'error' && 'Update failed'}
              </div>
              <div className="update-toast__description">
                {updateStatus.status === 'checking' && 'Scanning GitHub Releases...'}
                {updateStatus.status === 'available' && 'Downloading in background...'}
                {updateStatus.status === 'downloaded' && 'Restarting app in 5 seconds to install...'}
                {updateStatus.status === 'error' && (updateStatus.message || 'An error occurred during update.')}
              </div>
            </div>
            {updateStatus.status === 'error' && (
              <button className="update-toast__close" onClick={() => setUpdateStatus(null)}>
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
