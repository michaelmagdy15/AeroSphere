import React from 'react';
import Button from '../common/Button';
import { GlassPanel } from '../layout/GlassPanel';
import type { Pilot, FlightRecord } from '@shared/types';
import './CareerDashboard.css';

interface CareerDashboardProps {
  pilot?: Pilot;
  recentFlights?: FlightRecord[];
  onNavigate?: (page: string) => void;
}

const MOCK_PILOT: Pilot = {
  pilot_id: 1,
  name: 'Alex Morgan',
  license: 'CPL',
  balance: 47250,
  total_flights: 142,
  total_hours: 387.5,
  reputation: 76,
  xp: 3200,
  home_base: 'KJFK',
  current_location: 'KJFK',
};

const MOCK_FLIGHTS: FlightRecord[] = [
  { flight_id: 1, departure_icao: 'KJFK', arrival_icao: 'KBOS', aircraft_id: 1, flight_time_hrs: 1.8, landing_rate_fpm: 95, status: 'completed', fuel_used_gal: 32, fuel_cost: 192, mission_id: 1 },
  { flight_id: 2, departure_icao: 'KBOS', arrival_icao: 'KORD', aircraft_id: 1, flight_time_hrs: 3.2, landing_rate_fpm: 145, status: 'completed', fuel_used_gal: 58, fuel_cost: 348, mission_id: 2 },
  { flight_id: 3, departure_icao: 'KORD', arrival_icao: 'KDFW', aircraft_id: 2, flight_time_hrs: 2.6, landing_rate_fpm: 210, status: 'completed', fuel_used_gal: 440, fuel_cost: 2640, mission_id: 3 },
  { flight_id: 4, departure_icao: 'KDFW', arrival_icao: 'KLAX', aircraft_id: 2, flight_time_hrs: 3.1, landing_rate_fpm: 78, status: 'completed', fuel_used_gal: 510, fuel_cost: 3060, mission_id: 4 },
  { flight_id: 5, departure_icao: 'KLAX', arrival_icao: 'KSFO', aircraft_id: 3, flight_time_hrs: 1.2, landing_rate_fpm: 165, status: 'completed', fuel_used_gal: 280, fuel_cost: 1680, mission_id: 5 },
];

const LICENSE_LEVELS = ['SPL', 'PPL', 'CPL', 'ATPL'] as const;

const REVENUE_DATA = [1200, 3400, 2800, 5200, 4100, 6800, 5400, 7200, 6100, 8400, 7800, 9500];

function getLandingRateClass(rate: number): string {
  if (rate < 120) return 'career-dashboard__flight-rate--green';
  if (rate < 200) return 'career-dashboard__flight-rate--amber';
  return 'career-dashboard__flight-rate--red';
}

function getLicenseState(license: string, segment: string): string {
  const idx = LICENSE_LEVELS.indexOf(license as typeof LICENSE_LEVELS[number]);
  const segIdx = LICENSE_LEVELS.indexOf(segment as typeof LICENSE_LEVELS[number]);
  if (segIdx < idx) return 'completed';
  if (segIdx === idx) return 'current';
  return 'future';
}

export default function CareerDashboard({ pilot, recentFlights, onNavigate }: CareerDashboardProps) {
  const p = pilot ?? MOCK_PILOT;
  const flights = recentFlights ?? MOCK_FLIGHTS;

  const chartMax = Math.max(...REVENUE_DATA);
  const chartH = 140;
  const chartW = 1000;
  const points = REVENUE_DATA.map((v, i) =>
    `${(i / (REVENUE_DATA.length - 1)) * chartW},${chartH - (v / chartMax) * (chartH - 20)}`
  ).join(' ');
  const fillPoints = `0,${chartH} ${points} ${chartW},${chartH}`;

  return (
    <div className="career-dashboard">
      {/* Welcome Banner */}
      <div className="career-dashboard__welcome">
        <h1 className="career-dashboard__welcome-title">Welcome back, Captain {p.name}</h1>
        <span className="career-dashboard__license-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          {p.license} License
        </span>
      </div>

      {/* Stats Row */}
      <div className="career-dashboard__stats">
        <div className="career-dashboard__stat-card">
          <svg className="career-dashboard__stat-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="career-dashboard__stat-value career-dashboard__stat-value--green">
            ${p.balance.toLocaleString()}
          </span>
          <span className="career-dashboard__stat-label">Balance</span>
        </div>

        <div className="career-dashboard__stat-card">
          <svg className="career-dashboard__stat-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
          <span className="career-dashboard__stat-value career-dashboard__stat-value--blue">
            {p.total_flights}
          </span>
          <span className="career-dashboard__stat-label">Total Flights</span>
        </div>

        <div className="career-dashboard__stat-card">
          <svg className="career-dashboard__stat-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="career-dashboard__stat-value career-dashboard__stat-value--amber">
            {p.total_hours.toFixed(1)}
          </span>
          <span className="career-dashboard__stat-label">Flight Hours</span>
        </div>

        <div className="career-dashboard__stat-card">
          <svg className="career-dashboard__stat-icon" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <div className="career-dashboard__reputation-bar">
            <div className="career-dashboard__reputation-fill" style={{ width: `${p.reputation}%` }} />
          </div>
          <span className="career-dashboard__reputation-text">{p.reputation}/100</span>
          <span className="career-dashboard__stat-label">Reputation</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="career-dashboard__actions">
        <Button variant="primary" size="md" onClick={() => onNavigate?.('missions')}>Find Missions</Button>
        <Button variant="secondary" size="md" onClick={() => onNavigate?.('fleet')}>My Fleet</Button>
        <Button variant="secondary" size="md" onClick={() => onNavigate?.('bases')}>My Bases</Button>
      </div>

      {/* Bottom Grid: Recent Flights + Revenue Chart */}
      <div className="career-dashboard__bottom-grid">
        {/* Recent Flights */}
        <GlassPanel>
          <div className="career-dashboard__recent-header">
            <h2 className="career-dashboard__recent-title">Recent Flights</h2>
          </div>
          {flights.slice(0, 5).map((f) => (
            <div key={f.flight_id} className="career-dashboard__flight-row">
              <span className="career-dashboard__flight-route">{f.departure_icao} → {f.arrival_icao}</span>
              <span className={`career-dashboard__flight-rate ${getLandingRateClass(f.landing_rate_fpm)}`}>
                {f.landing_rate_fpm} fpm
              </span>
              <span className="career-dashboard__flight-payout">${(f.fuel_cost * 2.5).toLocaleString() /* Simulated payout */}</span>
            </div>
          ))}
        </GlassPanel>

        {/* Revenue Chart */}
        <GlassPanel>
          <h2 className="career-dashboard__chart-header">Revenue</h2>
          <svg className="career-dashboard__chart-svg" viewBox={`0 0 ${chartW} ${chartH + 10}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={fillPoints} fill="url(#chartGrad)" />
            <polyline points={points} fill="none" stroke="var(--accent-blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {REVENUE_DATA.map((v, i) => (
              <circle key={i} cx={(i / (REVENUE_DATA.length - 1)) * chartW} cy={chartH - (v / chartMax) * (chartH - 20)} r="4" fill="var(--accent-blue)" />
            ))}
          </svg>
        </GlassPanel>
      </div>

      {/* License Progression */}
      <GlassPanel>
        <h2 className="career-dashboard__chart-header">License Progression</h2>
        <div className="career-dashboard__license-row">
          {LICENSE_LEVELS.map((lvl) => {
            const state = getLicenseState(p.license, lvl);
            return (
              <div key={lvl} className="career-dashboard__license-segment">
                <span className="career-dashboard__license-label">{lvl}</span>
                <div className={`career-dashboard__license-bar career-dashboard__license-bar--${state}`} />
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
}
