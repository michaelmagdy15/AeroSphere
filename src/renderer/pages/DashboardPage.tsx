import { GlassPanel } from '../components/layout/GlassPanel';
import './DashboardPage.css';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  return (
    <div className="dash">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="dash-hero">
        <div className="dash-hero__content">
          <p className="dash-hero__greeting">Welcome back, Captain</p>
          <h1 className="dash-hero__name">
            Your <span>AeroSphere</span> Studio
          </h1>
          <p className="dash-hero__sub">
            Dynamic LOD management, shared cockpit experiences, and virtual
            airline career — all in one premium companion app.
          </p>
        </div>
      </section>

      {/* ── Feature Cards ────────────────────────────────── */}
      <section className="dash-features">
        {/* LOD Engine */}
        <div
          className="dash-card dash-card--blue animate-fade-in-up stagger-1"
          onClick={() => onNavigate('lod-engine')}
        >
          <div className="dash-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
              <path d="M12 12l3.5-3.5" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
          <h3 className="dash-card__title">LOD Engine</h3>
          <div className="dash-card__status">
            <span className="dash-card__dot dash-card__dot--green" />
            Active — Auto mode
          </div>
          <button className="dash-card__btn">Open</button>
        </div>

        {/* Shared Cockpit */}
        <div
          className="dash-card dash-card--green animate-fade-in-up stagger-2"
          onClick={() => onNavigate('cockpit')}
        >
          <div className="dash-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 12c0 0 2-7 10-7s10 7 10 7" />
              <path d="M2 12c0 0 2 5 10 5s10-5 10-5" />
              <path d="M12 5v-2M12 17v4" />
              <path d="M8 11l-5 1M16 11l5 1" />
            </svg>
          </div>
          <h3 className="dash-card__title">Shared Cockpit</h3>
          <div className="dash-card__status">
            <span className="dash-card__dot dash-card__dot--muted" />
            Not connected
          </div>
          <button className="dash-card__btn">Open</button>
        </div>

        {/* Career Mode */}
        <div
          className="dash-card dash-card--amber animate-fade-in-up stagger-3"
          onClick={() => onNavigate('career')}
        >
          <div className="dash-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
              <path d="M2 12h20" />
              <circle cx="12" cy="14" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h3 className="dash-card__title">Career Mode</h3>
          <div className="dash-card__status">
            <span className="dash-card__dot dash-card__dot--amber" />
            $12,500 balance
          </div>
          <button className="dash-card__btn">Open</button>
        </div>
      </section>

      {/* ── Quick Stats ──────────────────────────────────── */}
      <section className="dash-stats">
        <div className="dash-stat animate-fade-in-up stagger-4">
          <div className="dash-stat__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </div>
          <div className="dash-stat__info">
            <span className="dash-stat__value">42 fps</span>
            <span className="dash-stat__label">Frame Rate</span>
          </div>
        </div>

        <div className="dash-stat animate-fade-in-up stagger-5">
          <div className="dash-stat__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
          <div className="dash-stat__info">
            <span className="dash-stat__value">Offline</span>
            <span className="dash-stat__label">SimConnect</span>
          </div>
        </div>

        <div className="dash-stat animate-fade-in-up stagger-6">
          <div className="dash-stat__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="dash-stat__info">
            <span className="dash-stat__value">0 h</span>
            <span className="dash-stat__label">Flight Time</span>
          </div>
        </div>
      </section>
    </div>
  );
}
