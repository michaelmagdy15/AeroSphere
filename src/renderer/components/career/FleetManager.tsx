import { useCareer } from '../../hooks/useCareer';
import { GlassPanel } from '../layout/GlassPanel';
import type { Aircraft } from '@shared/types';
import './FleetManager.css';

function conditionClass(pct: number): string {
  if (pct > 80) return 'fleet-manager__condition-fill--green';
  if (pct >= 40) return 'fleet-manager__condition-fill--amber';
  return 'fleet-manager__condition-fill--red';
}

const STATUS_LABELS: Record<Aircraft['status'], string> = {
  available: 'Available',
  in_flight: 'In Flight',
  maintenance: 'Maintenance',
  grounded: 'Grounded',
};

export default function FleetManager() {
  const { fleet } = useCareer();

  return (
    <div className="fleet-manager">
      <div className="fleet-manager__header">
        <h1 className="fleet-manager__title">Fleet Manager</h1>
        <span className="fleet-manager__count">{fleet.length}</span>
      </div>

      {fleet.length === 0 ? (
        <div className="fleet-manager__empty">
          <svg className="fleet-manager__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
          <h3 className="fleet-manager__empty-title">No aircraft in your fleet yet</h3>
          <p className="fleet-manager__empty-sub">Visit the Shop to purchase your first aircraft</p>
        </div>
      ) : (
        <div className="fleet-manager__grid">
          {fleet.map((ac) => (
            <GlassPanel key={ac.aircraft_id} className="fleet-manager__card">
              <div className="fleet-manager__card-header">
                <span className="fleet-manager__registration">{ac.registration}</span>
                <span className={`fleet-manager__status-badge fleet-manager__status-badge--${ac.status}`}>
                  {STATUS_LABELS[ac.status]}
                </span>
              </div>

              <div className="fleet-manager__location">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
                <span>{ac.location_icao}</span>
              </div>

              <div className="fleet-manager__condition-section">
                <div className="fleet-manager__stat-row">
                  <span className="fleet-manager__stat-label">Condition</span>
                  <span className="fleet-manager__stat-value">{ac.condition_pct}%</span>
                </div>
                <div className="fleet-manager__condition-bar">
                  <div
                    className={`fleet-manager__condition-fill ${conditionClass(ac.condition_pct)}`}
                    style={{ width: `${ac.condition_pct}%` }}
                  />
                </div>
              </div>

              <div className="fleet-manager__stats-grid">
                <div className="fleet-manager__stat-row">
                  <span className="fleet-manager__stat-label">Total Hours</span>
                  <span className="fleet-manager__stat-value">{ac.total_hours.toFixed(1)}</span>
                </div>
                <div className="fleet-manager__stat-row">
                  <span className="fleet-manager__stat-label">Since MX</span>
                  <span className="fleet-manager__stat-value">{ac.hours_since_mx.toFixed(0)}h</span>
                </div>
                <div className="fleet-manager__stat-row">
                  <span className="fleet-manager__stat-label">Fuel</span>
                  <span className="fleet-manager__stat-value">{ac.fuel_onboard_gal.toFixed(0)} gal</span>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
