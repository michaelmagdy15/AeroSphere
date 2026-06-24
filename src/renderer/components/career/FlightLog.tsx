import React, { useState, useMemo } from 'react';
import { GlassPanel } from '../layout/GlassPanel';
import type { FlightRecord } from '@shared/types';
import './FlightLog.css';

interface FlightLogProps {
  flights?: FlightRecord[];
}

type SortField = 'flight_id' | 'route' | 'aircraft' | 'time' | 'landingRate' | 'fuelCost' | 'status';
type SortDir = 'asc' | 'desc';

const MOCK_FLIGHTS: FlightRecord[] = [
  { flight_id: 1, departure_icao: 'KJFK', arrival_icao: 'KBOS', aircraft_id: 1, flight_time_hrs: 1.8, landing_rate_fpm: 95,  fuel_cost: 192,  status: 'completed', fuel_used_gal: 32,  mission_id: 1 },
  { flight_id: 2, departure_icao: 'KBOS', arrival_icao: 'KORD', aircraft_id: 1, flight_time_hrs: 3.2, landing_rate_fpm: 145, fuel_cost: 348,  status: 'completed', fuel_used_gal: 58,  mission_id: 2 },
  { flight_id: 3, departure_icao: 'KORD', arrival_icao: 'KDFW', aircraft_id: 2, flight_time_hrs: 2.6, landing_rate_fpm: 210, fuel_cost: 2640, status: 'completed', fuel_used_gal: 440, mission_id: 3 },
  { flight_id: 4, departure_icao: 'KDFW', arrival_icao: 'KLAX', aircraft_id: 2, flight_time_hrs: 3.1, landing_rate_fpm: 78,  fuel_cost: 3060, status: 'completed', fuel_used_gal: 510, mission_id: 4 },
  { flight_id: 5, departure_icao: 'KLAX', arrival_icao: 'KSFO', aircraft_id: 3, flight_time_hrs: 1.2, landing_rate_fpm: 165, fuel_cost: 1680, status: 'diverted',  fuel_used_gal: 280, mission_id: 5 },
  { flight_id: 6, departure_icao: 'KSFO', arrival_icao: 'KLAS', aircraft_id: 3, flight_time_hrs: 1.5, landing_rate_fpm: 250, fuel_cost: 1860, status: 'crashed',   fuel_used_gal: 310, mission_id: 6 },
  { flight_id: 7, departure_icao: 'KLAS', arrival_icao: 'KPHX', aircraft_id: 2, flight_time_hrs: 0.9, landing_rate_fpm: 112, fuel_cost: 1080, status: 'completed', fuel_used_gal: 180, mission_id: 7 },
  { flight_id: 8, departure_icao: 'KPHX', arrival_icao: 'KDEN', aircraft_id: 1, flight_time_hrs: 2.0, landing_rate_fpm: 190, fuel_cost: 570,  status: 'aborted',   fuel_used_gal: 95,  mission_id: 8 },
];

function rateClass(rate: number): string {
  if (rate < 120) return 'flight-log__rate--green';
  if (rate < 200) return 'flight-log__rate--amber';
  return 'flight-log__rate--red';
}

const COLUMNS: { key: SortField; label: string }[] = [
  { key: 'flight_id', label: 'ID' },
  { key: 'route', label: 'Route' },
  { key: 'aircraft', label: 'Aircraft' },
  { key: 'time', label: 'Time' },
  { key: 'landingRate', label: 'Landing Rate' },
  { key: 'fuelCost', label: 'Fuel Cost' },
  { key: 'status', label: 'Status' },
];

function getSortValue(f: FlightRecord, key: SortField): string | number {
  switch (key) {
    case 'flight_id': return f.flight_id;
    case 'route': return `${f.departure_icao}${f.arrival_icao}`;
    case 'aircraft': return f.aircraft_id;
    case 'time': return f.flight_time_hrs;
    case 'landingRate': return f.landing_rate_fpm;
    case 'fuelCost': return f.fuel_cost;
    case 'status': return f.status;
  }
}

export default function FlightLog({ flights }: FlightLogProps) {
  const data = flights ?? MOCK_FLIGHTS;
  const [sortField, setSortField] = useState<SortField>('flight_id');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = getSortValue(a, sortField);
      const bv = getSortValue(b, sortField);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortField, sortDir]);

  const getAircraftReg = (id: number) => {
    const regs: Record<number, string> = { 1: 'N172SP', 2: 'N320AE', 3: 'N750GX' };
    return regs[id] || `AC-00${id}`;
  };

  return (
    <GlassPanel className="flight-log">
      <div className="flight-log__header">
        <h1 className="flight-log__title">Flight Log</h1>
        <span className="flight-log__count">{data.length}</span>
      </div>

      <table className="flight-log__table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`flight-log__th ${sortField === col.key ? 'flight-log__th--active' : ''}`}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                {sortField === col.key && (
                  <span className="flight-log__sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((f) => (
            <React.Fragment key={f.flight_id}>
              <tr className="flight-log__row" onClick={() => setExpandedId(expandedId === f.flight_id ? null : f.flight_id)}>
                <td className="flight-log__td">#{f.flight_id}</td>
                <td className="flight-log__td flight-log__route">{f.departure_icao} → {f.arrival_icao}</td>
                <td className="flight-log__td">{getAircraftReg(f.aircraft_id)}</td>
                <td className="flight-log__td">{f.flight_time_hrs.toFixed(1)}h</td>
                <td className={`flight-log__td ${rateClass(f.landing_rate_fpm)}`}>{f.landing_rate_fpm} fpm</td>
                <td className="flight-log__td flight-log__payout">${f.fuel_cost.toLocaleString()}</td>
                <td className="flight-log__td">
                  <span className={`flight-log__status flight-log__status--${f.status}`}>{f.status}</span>
                </td>
              </tr>
              {expandedId === f.flight_id && (
                <tr className="flight-log__expanded-row">
                  <td colSpan={7}>
                    <div className="flight-log__expanded-panel">
                      <div className="flight-log__expanded-item">
                        <span className="flight-log__expanded-label">Fuel Used</span>
                        <span className="flight-log__expanded-value">{f.fuel_used_gal} gal</span>
                      </div>
                      <div className="flight-log__expanded-item">
                        <span className="flight-log__expanded-label">Fuel Cost</span>
                        <span className="flight-log__expanded-value">${f.fuel_cost.toLocaleString()}</span>
                      </div>
                      <div className="flight-log__expanded-item">
                        <span className="flight-log__expanded-label">Mission ID</span>
                        <span className="flight-log__expanded-value">{f.mission_id ?? '—'}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </GlassPanel>
  );
}
