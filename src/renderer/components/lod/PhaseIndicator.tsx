import React from 'react';
import type { FlightPhase } from '../../../shared/types';
import './PhaseIndicator.css';

interface PhaseIndicatorProps {
  phase: FlightPhase;
}

const PHASE_ICONS: Record<FlightPhase, string> = {
  ground: '✈',
  takeoff: '↗',
  climb: '⬆',
  cruise: '➡',
  descent: '⬇',
  approach: '↙',
};

const PHASE_COLORS: Record<FlightPhase, string> = {
  ground: 'var(--accent-amber)',
  takeoff: 'var(--accent-green)',
  climb: 'var(--accent-blue)',
  cruise: 'var(--accent-blue)',
  descent: 'var(--accent-amber)',
  approach: 'var(--accent-green)',
};

export default function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  const icon = PHASE_ICONS[phase];
  const color = PHASE_COLORS[phase];

  return (
    <div
      className="phase-indicator"
      style={{
        color,
        backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`,
        borderColor: `color-mix(in oklch, ${color} 25%, transparent)`,
      }}
    >
      <span className="phase-icon">{icon}</span>
      <span className="phase-label">{phase}</span>
    </div>
  );
}
