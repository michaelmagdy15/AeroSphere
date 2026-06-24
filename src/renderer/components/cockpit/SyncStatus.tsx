import React from 'react';
import { GlassPanel } from '../layout/GlassPanel';
import './SyncStatus.css';

interface RecentControl {
  name: string;
  value: number;
  lastSync: number;
}

interface SyncStatusProps {
  syncedCount?: number;
  syncRateHz?: number;
  latencyMs?: number;
  health?: 'excellent' | 'good' | 'fair' | 'poor';
  recentControls?: RecentControl[];
}

type HealthLevel = NonNullable<SyncStatusProps['health']>;

const healthColors: Record<HealthLevel, string> = {
  excellent: 'var(--accent-green)',
  good: 'var(--accent-blue)',
  fair: 'var(--accent-amber)',
  poor: 'var(--accent-red)',
};

const healthDimColors: Record<HealthLevel, string> = {
  excellent: 'var(--accent-green-dim)',
  good: 'var(--accent-blue-dim)',
  fair: 'var(--accent-amber-dim)',
  poor: 'var(--accent-red-dim)',
};

function latencyColor(ms: number): string {
  if (ms < 30) return 'var(--accent-green)';
  if (ms < 80) return 'var(--accent-amber)';
  return 'var(--accent-red)';
}

const defaultRecentControls: RecentControl[] = [
  { name: 'THROTTLE_1', value: 0.78, lastSync: Date.now() - 200 },
  { name: 'FLAPS_HANDLE', value: 2, lastSync: Date.now() - 800 },
  { name: 'GEAR_LEVER', value: 1, lastSync: Date.now() - 1500 },
  { name: 'SPD_BRAKE', value: 0, lastSync: Date.now() - 2100 },
  { name: 'AILERON_TRIM', value: 0.02, lastSync: Date.now() - 3400 },
  { name: 'RUDDER_POS', value: -0.01, lastSync: Date.now() - 4200 },
  { name: 'ELEV_TRIM', value: 0.15, lastSync: Date.now() - 5800 },
  { name: 'PARK_BRAKE', value: 1, lastSync: Date.now() - 7000 },
];

const SyncStatus: React.FC<SyncStatusProps> = ({
  syncedCount = 247,
  syncRateHz = 30,
  latencyMs = 24,
  health = 'excellent',
  recentControls,
}) => {
  const controls = recentControls ?? defaultRecentControls;
  const now = Date.now();
  const color = healthColors[health];
  const dimColor = healthDimColors[health];

  return (
    <GlassPanel className="sync-status">
      {/* Header */}
      <div className="sync-status__header animate-fade-in">
        <h3 className="sync-status__title">Sync Health</h3>
        <div className="sync-status__health">
          <span className="sync-status__health-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="sync-status__health-label" style={{ color, background: dimColor }}>
            {health}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="sync-status__stats animate-fade-in stagger-1">
        <div className="sync-status__stat-card">
          <span className="sync-status__stat-label">Synced Vars</span>
          <span className="sync-status__stat-value">{syncedCount}</span>
        </div>
        <div className="sync-status__stat-card">
          <span className="sync-status__stat-label">Sync Rate</span>
          <span className="sync-status__stat-value">{syncRateHz}<span className="sync-status__stat-unit">Hz</span></span>
        </div>
        <div className="sync-status__stat-card">
          <span className="sync-status__stat-label">Latency</span>
          <span className="sync-status__stat-value" style={{ color: latencyColor(latencyMs) }}>
            {latencyMs}<span className="sync-status__stat-unit">ms</span>
          </span>
        </div>
      </div>

      {/* Recent controls */}
      <div className="sync-status__recent animate-fade-in stagger-2">
        <span className="sync-status__recent-label">Recent Activity</span>
        <ul className="sync-status__list">
          {controls.map((ctrl, i) => {
            const age = now - ctrl.lastSync;
            const opacity = Math.max(0.3, 1 - age / 8000);
            return (
              <li key={ctrl.name} className={`sync-status__row stagger-${Math.min(i + 1, 6)}`} style={{ opacity }}>
                <span className="sync-status__activity-dot" />
                <span className="sync-status__control-name">{ctrl.name}</span>
                <span className="sync-status__control-value">{typeof ctrl.value === 'number' ? ctrl.value.toFixed(2) : ctrl.value}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </GlassPanel>
  );
};

export default SyncStatus;
