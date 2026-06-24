import './Header.css';

interface HeaderProps {
  simConnected: boolean;
  fps: number;
  altitude: number;
}

function fpsClass(fps: number): string {
  if (fps >= 30) return 'header__status-value--good';
  if (fps >= 20) return 'header__status-value--warn';
  return 'header__status-value--bad';
}

function formatAltitude(alt: number): string {
  return alt.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function Header({ simConnected, fps, altitude }: HeaderProps) {
  return (
    <header className="header">
      {/* Left: Title */}
      <div className="header__title">
        <span className="header__title-text">AeroSphere Studio</span>
        <span className="header__title-badge">Alpha</span>
      </div>

      {/* Right: Status badges */}
      <div className="header__status">
        {/* SimConnect Status */}
        <div className="header__status-badge">
          <span
            className={`header__status-dot ${
              simConnected
                ? 'header__status-dot--connected'
                : 'header__status-dot--disconnected'
            }`}
          />
          <span className="header__status-label">SimConnect</span>
          <span className="header__status-value">
            {simConnected ? 'Live' : 'Off'}
          </span>
        </div>

        {/* FPS */}
        <div className="header__status-badge">
          <svg className="header__status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          <span className="header__status-label">FPS</span>
          <span className={`header__status-value ${fpsClass(fps)}`}>
            {fps}
          </span>
        </div>

        {/* Altitude */}
        <div className="header__status-badge">
          <svg className="header__status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M2 12l10-8 10 8" />
          </svg>
          <span className="header__status-label">ALT</span>
          <span className="header__status-value">
            {formatAltitude(altitude)} ft
          </span>
        </div>
      </div>

      {/* Window Controls */}
      <div className="header__controls">
        <button
          className="header__ctrl-btn header__ctrl-btn--minimize"
          title="Minimize"
          onClick={() => (window.aerosphere as any).minimize()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          className="header__ctrl-btn header__ctrl-btn--close"
          title="Close"
          onClick={() => (window.aerosphere as any).close()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
}
