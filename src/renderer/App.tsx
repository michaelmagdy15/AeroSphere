import { useState, useEffect, lazy, Suspense, type ComponentType } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlassPanel } from './components/layout/GlassPanel';
import { AuthScreen } from './components/common/AuthScreen';
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

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
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
        <Header simConnected={false} fps={42} altitude={35000} />
        <div className="app-content">
          <Suspense fallback={<PageSpinner />}>
            <div className="page-transition" key={activePage}>
              {renderPage()}
            </div>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
