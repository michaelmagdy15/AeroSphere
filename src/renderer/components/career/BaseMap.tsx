import { useState, useMemo } from 'react';
import { GlassPanel } from '../layout/GlassPanel';
import { useCareer } from '../../hooks/useCareer';
import './BaseMap.css';

const CONTINENT_PATHS = [
  'M 80 60 L 120 40 L 170 45 L 200 70 L 190 100 L 160 120 L 130 130 L 100 110 L 80 80 Z',
  'M 150 140 L 170 130 L 190 150 L 185 200 L 170 230 L 155 220 L 145 180 Z',
  'M 270 45 L 300 35 L 320 50 L 310 70 L 290 75 L 270 65 Z',
  'M 270 80 L 310 80 L 320 110 L 310 160 L 290 170 L 270 150 L 260 110 Z',
  'M 320 30 L 420 25 L 450 50 L 440 80 L 400 90 L 360 80 L 330 60 Z',
  'M 410 150 L 450 145 L 460 165 L 445 180 L 415 175 Z',
];

const ICAO_COORDS: Record<string, [number, number]> = {
  'KJFK': [155, 72], 'KLAX': [95, 82], 'KORD': [140, 68],
  'KATL': [145, 82], 'KBOS': [160, 68], 'KDFW': [130, 85],
  'KSFO': [90, 76], 'KDEN': [115, 74], 'KLAS': [100, 80],
  'KPHX': [105, 84], 'PHNL': [55, 100],
  'EGLL': [278, 52], 'LFPG': [282, 55], 'EDDF': [290, 52],
  'LIRF': [293, 62], 'RJTT': [430, 65], 'RKSI': [418, 60],
};

interface MarkerInfo {
  icao: string;
  x: number;
  y: number;
  type: 'home' | 'current' | 'fleet';
}

export default function BaseMap() {
  const { pilot, fleet } = useCareer();
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);

  const markers = useMemo(() => {
    const result: MarkerInfo[] = [];
    const seen = new Set<string>();

    // Home base
    if (ICAO_COORDS[pilot.home_base]) {
      const [x, y] = ICAO_COORDS[pilot.home_base];
      result.push({ icao: pilot.home_base, x, y, type: 'home' });
      seen.add(pilot.home_base);
    }

    // Current location
    if (ICAO_COORDS[pilot.current_location] && !seen.has(pilot.current_location)) {
      const [x, y] = ICAO_COORDS[pilot.current_location];
      result.push({ icao: pilot.current_location, x, y, type: 'current' });
      seen.add(pilot.current_location);
    } else if (seen.has(pilot.current_location)) {
      // Upgrade home to current if same location
      const existing = result.find((m) => m.icao === pilot.current_location);
      if (existing) existing.type = 'current';
    }

    // Fleet aircraft locations
    for (const ac of fleet) {
      if (ICAO_COORDS[ac.location_icao] && !seen.has(ac.location_icao)) {
        const [x, y] = ICAO_COORDS[ac.location_icao];
        result.push({ icao: ac.location_icao, x, y, type: 'fleet' });
        seen.add(ac.location_icao);
      }
    }

    return result;
  }, [pilot, fleet]);

  const selectedMarker = markers.find((m) => m.icao === selectedIcao);

  return (
    <div className="base-map">
      <div className="base-map__header">
        <h1 className="base-map__title">World Map</h1>
        <div className="base-map__legend">
          <span className="base-map__legend-item"><span className="base-map__legend-dot base-map__legend-dot--current" /> Current</span>
          <span className="base-map__legend-item"><span className="base-map__legend-dot base-map__legend-dot--home" /> Home</span>
          <span className="base-map__legend-item"><span className="base-map__legend-dot base-map__legend-dot--fleet" /> Fleet</span>
        </div>
      </div>

      <GlassPanel className="base-map__svg-container">
        <svg viewBox="0 0 500 250" className="base-map__svg">
          {/* Grid lines */}
          {Array.from({ length: 10 }, (_, i) => (
            <line key={`h${i}`} className="base-map__grid-line" x1="0" y1={i * 25} x2="500" y2={i * 25} />
          ))}
          {Array.from({ length: 20 }, (_, i) => (
            <line key={`v${i}`} className="base-map__grid-line" x1={i * 25} y1="0" x2={i * 25} y2="250" />
          ))}

          {/* Continents */}
          {CONTINENT_PATHS.map((d, i) => (
            <path key={i} d={d} className="base-map__continent" />
          ))}

          {/* Markers */}
          {markers.map((m) => (
            <g key={m.icao} onClick={() => setSelectedIcao(selectedIcao === m.icao ? null : m.icao)} style={{ cursor: 'pointer' }}>
              {m.type === 'current' && (
                <circle cx={m.x} cy={m.y} r="12" className="base-map__pulse" />
              )}
              <circle
                cx={m.x}
                cy={m.y}
                r="5"
                className={`base-map__marker base-map__marker--${m.type}`}
              />
              <text
                x={m.x}
                y={m.y - 10}
                className="base-map__label"
                textAnchor="middle"
              >
                {m.icao}
              </text>
            </g>
          ))}
        </svg>

        {/* Info Panel */}
        {selectedMarker && (
          <div className="base-map__info-panel">
            <div className="base-map__info-header">
              <span className="base-map__info-icao">{selectedMarker.icao}</span>
              <button className="base-map__info-close" onClick={() => setSelectedIcao(null)}>✕</button>
            </div>
            <div className="base-map__info-row">
              <span className="base-map__info-label">Type</span>
              <span className="base-map__info-value">
                {selectedMarker.type === 'home' ? '🏠 Home Base' :
                 selectedMarker.type === 'current' ? '📍 Current Location' : '✈️ Fleet Location'}
              </span>
            </div>
            {selectedMarker.icao === pilot.home_base && (
              <div className="base-map__info-row">
                <span className="base-map__info-label">Status</span>
                <span className="base-map__info-value">Primary hub</span>
              </div>
            )}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
