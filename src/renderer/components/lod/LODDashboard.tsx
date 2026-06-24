import React from 'react';
import { useLOD } from '../../hooks/useLOD';
import { useSimConnect } from '../../hooks/useSimConnect';
import Gauge from '../common/Gauge';
import Slider from '../common/Slider';
import Toggle from '../common/Toggle';
import StatusBadge from '../common/StatusBadge';
import PhaseIndicator from './PhaseIndicator';
import './LODDashboard.css';

export default function LODDashboard() {
  const { lodState, settings, setSettings, toggleLOD } = useLOD();
  const { isConnected } = useSimConnect();

  return (
    <div className="lod-dashboard">
      {/* Header */}
      <header className="lod-header">
        <h1 className="lod-title">LOD Manager</h1>
        <div className="lod-badges">
          <StatusBadge
            status={isConnected ? 'online' : 'offline'}
            label={isConnected ? 'Connected' : 'Disconnected'}
          />
          <StatusBadge
            status={lodState.isPatched ? 'online' : 'error'}
            label={lodState.isPatched ? 'Memory Patched' : 'Not Patched'}
          />
        </div>
      </header>

      {/* Gauges */}
      <section className="lod-gauges">
        <Gauge
          value={lodState.currentFPS}
          min={0}
          max={120}
          label="FPS"
          unit="fps"
        />
        <Gauge
          value={lodState.currentTLOD}
          min={0}
          max={settings.maxTLOD || 400}
          label="TLOD"
        />
        <Gauge
          value={lodState.currentOLOD}
          min={0}
          max={settings.maxOLOD || 200}
          label="OLOD"
        />
      </section>

      {/* Phase */}
      <div className="lod-phase">
        <PhaseIndicator phase={lodState.phase} />
      </div>

      {/* Settings */}
      <section className="lod-settings">
        <h2 className="lod-settings-title">Settings</h2>

        <div className="lod-toggles">
          <Toggle
            checked={settings.enabled}
            onChange={() => setSettings({ enabled: !settings.enabled })}
            label="Dynamic LOD"
          />

        </div>

        <div className="lod-sliders">
          <Slider
            value={settings.targetFPS}
            min={20}
            max={120}
            step={5}
            label="Target FPS"
            onChange={(v) => setSettings({ targetFPS: v })}
          />
          <Slider
            value={settings.minTLOD}
            min={10}
            max={settings.maxTLOD}
            step={10}
            label="Min TLOD"
            onChange={(v) => setSettings({ minTLOD: v })}
          />
          <Slider
            value={settings.maxTLOD}
            min={settings.minTLOD}
            max={1000}
            step={10}
            label="Max TLOD"
            onChange={(v) => setSettings({ maxTLOD: v })}
          />
          <Slider
            value={settings.minOLOD}
            min={10}
            max={settings.maxOLOD}
            step={10}
            label="Min OLOD"
            onChange={(v) => setSettings({ minOLOD: v })}
          />
          <Slider
            value={settings.maxOLOD}
            min={settings.minOLOD}
            max={500}
            step={10}
            label="Max OLOD"
            onChange={(v) => setSettings({ maxOLOD: v })}
          />
        </div>
      </section>
    </div>
  );
}
