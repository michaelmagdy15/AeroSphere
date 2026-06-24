import React, { useState, useMemo } from 'react';
import Button from '../common/Button';
import type { Mission, MissionType } from '@shared/types';
import './MissionBoard.css';

interface MissionBoardProps {
  missions?: Mission[];
  onAcceptMission?: (id: number) => void;
}

const MISSION_TYPES: MissionType[] = ['cargo', 'passenger', 'charter', 'medical', 'vip', 'tour'];

type SortKey = 'payout' | 'distance' | 'deadline';

const TYPE_COLORS: Record<MissionType, string> = {
  cargo: 'var(--accent-amber)',
  passenger: 'var(--accent-blue)',
  charter: 'var(--accent-green)',
  medical: 'var(--accent-red)',
  vip: 'hsl(270,80%,65%)',
  tour: 'hsl(180,70%,45%)',
};

const now = Date.now();

const MOCK_MISSIONS: Mission[] = [
  { mission_id: 1, type: 'cargo', origin_icao: 'KJFK', dest_icao: 'KLAX', distance_nm: 2150, payout: 12500, deadline: new Date(now + 8 * 3600000).toISOString(), status: 'available', description: 'Freight delivery — electronics', pax_count: 0, payload_lbs: 3200 },
  { mission_id: 2, type: 'passenger', origin_icao: 'EGLL', dest_icao: 'LFPG', distance_nm: 215, payout: 3200, deadline: new Date(now + 3 * 3600000).toISOString(), status: 'available', description: 'Scheduled passenger service', pax_count: 68, payload_lbs: 12000 },
  { mission_id: 3, type: 'charter', origin_icao: 'RJTT', dest_icao: 'RKSI', distance_nm: 720, payout: 8800, deadline: new Date(now + 12 * 3600000).toISOString(), status: 'available', description: 'Executive charter flight', pax_count: 8, payload_lbs: 1600 },
  { mission_id: 4, type: 'medical', origin_icao: 'KORD', dest_icao: 'KATL', distance_nm: 590, payout: 15000, deadline: new Date(now + 1.5 * 3600000).toISOString(), status: 'available', description: 'Priority medical evacuation', pax_count: 2, payload_lbs: 400 },
  { mission_id: 5, type: 'vip', origin_icao: 'EDDF', dest_icao: 'LIRF', distance_nm: 480, payout: 22000, deadline: new Date(now + 6 * 3600000).toISOString(), status: 'available', description: 'VIP delegation transport', pax_count: 4, payload_lbs: 800 },
  { mission_id: 6, type: 'tour', origin_icao: 'KSFO', dest_icao: 'PHNL', distance_nm: 2090, payout: 9400, deadline: new Date(now + 24 * 3600000).toISOString(), status: 'available', description: 'Scenic Hawaiian tour', pax_count: 12, payload_lbs: 2400 },
];

function getDeadlineDisplay(deadline: string): { text: string; urgent: boolean } {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return { text: 'Expired', urgent: true };
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { text: `${h}h ${m}m`, urgent: h < 2 };
}

function TypeIcon({ type }: { type: MissionType }) {
  const color = TYPE_COLORS[type];
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (type) {
    case 'cargo':
      return <svg {...common}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>;
    case 'passenger':
      return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case 'charter':
      return <svg {...common}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
    case 'medical':
      return <svg {...common}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
    case 'vip':
      return <svg {...common}><path d="M2 4l3 12h14l3-12-5 4-5-6-5 6-5-4z" /><path d="M5 16l-1 4h16l-1-4" /></svg>;
    case 'tour':
      return <svg {...common}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
  }
}

export default function MissionBoard({ missions, onAcceptMission }: MissionBoardProps) {
  const allMissions = missions ?? MOCK_MISSIONS;
  const [sortKey, setSortKey] = useState<SortKey>('payout');
  const [activeTypes, setActiveTypes] = useState<Set<MissionType>>(new Set(MISSION_TYPES));

  const toggleType = (t: MissionType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = allMissions.filter((m) => activeTypes.has(m.type));
    result.sort((a, b) => {
      if (sortKey === 'payout') return b.payout - a.payout;
      if (sortKey === 'distance') return a.distance_nm - b.distance_nm;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
    return result;
  }, [allMissions, sortKey, activeTypes]);

  return (
    <div className="mission-board">
      {/* Header */}
      <div className="mission-board__header">
        <h1 className="mission-board__title">Mission Board</h1>
        <span className="mission-board__count-badge">{filtered.length}</span>
      </div>

      {/* Controls */}
      <div className="mission-board__controls">
        <div className="mission-board__sort-row">
          <span className="mission-board__sort-label">Sort</span>
          {(['payout', 'distance', 'deadline'] as SortKey[]).map((k) => (
            <button key={k} className={`mission-board__pill ${sortKey === k ? 'mission-board__pill--active' : ''}`} onClick={() => setSortKey(k)}>
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <div className="mission-board__filter-row">
          <span className="mission-board__filter-label">Type</span>
          {MISSION_TYPES.map((t) => (
            <button key={t} className={`mission-board__pill mission-board__pill--${t} ${activeTypes.has(t) ? 'mission-board__pill--active' : ''}`} onClick={() => toggleType(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="mission-board__grid">
        {filtered.length === 0 ? (
          <div className="mission-board__empty">
            <svg className="mission-board__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><path d="M16.24 7.76l-8.48 8.48" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M2 12h2" /><path d="M20 12h2" />
            </svg>
            <h3 className="mission-board__empty-title">No missions available</h3>
            <p className="mission-board__empty-sub">Check back later for new contracts</p>
          </div>
        ) : (
          filtered.map((m) => {
            const dl = getDeadlineDisplay(m.deadline);
            const mid = m.mission_id ?? 0;
            return (
              <div key={mid} className="mission-board__card">
                <span className={`mission-board__stripe mission-board__stripe--${m.type}`} />
                <div className="mission-board__card-body">
                  <div className="mission-board__type-row">
                    <TypeIcon type={m.type} />
                    <span className={`mission-board__type-label mission-board__type-label--${m.type}`}>{m.type}</span>
                  </div>
                  <div className="mission-board__route">
                    {m.origin_icao}
                    <svg className="mission-board__route-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    {m.dest_icao}
                  </div>
                  <div className="mission-board__details">
                    <span>{m.distance_nm.toLocaleString()} nm</span>
                    {m.pax_count > 0 && <span>{m.pax_count} pax</span>}
                    {m.payload_lbs > 0 && <span>{m.payload_lbs.toLocaleString()} lbs</span>}
                    <span className={dl.urgent ? 'mission-board__deadline--urgent' : 'mission-board__deadline'}>{dl.text}</span>
                  </div>
                  <span className="mission-board__payout">${m.payout.toLocaleString()}</span>
                </div>
                <div className="mission-board__card-footer">
                  <Button variant="primary" size="sm" onClick={() => onAcceptMission?.(mid)} style={{ width: '100%' }}>
                    Accept Mission
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
