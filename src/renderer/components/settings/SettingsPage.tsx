import { useState, useCallback } from 'react';
import { GlassPanel } from '../layout/GlassPanel';
import Slider from '../common/Slider';
import Toggle from '../common/Toggle';
import { Button } from '../common/Button';
import TextInput from '../common/TextInput';
import Tabs from '../common/Tabs';
import Modal from '../common/Modal';
import { APP_VERSION, STARTING_BALANCE, SIGNALING_URL } from '../../../shared/constants';
import './SettingsPage.css';

// ── Settings state shape (mirrors SettingsStore) ──

interface SettingsState {
  communityFolderPath: string;
  autoStart: boolean;
  lodTargetFPS: number;
  lodMinTLOD: number;
  lodMaxTLOD: number;
  lodMinOLOD: number;
  lodMaxOLOD: number;
  defaultRole: 'pf' | 'pm' | 'observer';
  signalingServerUrl: string;
  pushToTalkKey: string;
  pilotName: string;
  startingBalance: number;
}

const DEFAULT_SETTINGS: SettingsState = {
  communityFolderPath: '',
  autoStart: false,
  lodTargetFPS: 40,
  lodMinTLOD: 100,
  lodMaxTLOD: 400,
  lodMinOLOD: 100,
  lodMaxOLOD: 300,
  defaultRole: 'pf',
  signalingServerUrl: SIGNALING_URL,
  pushToTalkKey: 'CapsLock',
  pilotName: 'Pilot',
  startingBalance: STARTING_BALANCE,
};

const TABS = [
  { id: 'general',  label: 'General' },
  { id: 'lod',      label: 'LOD Engine' },
  { id: 'cockpit',  label: 'Shared Cockpit' },
  { id: 'career',   label: 'Career' },
  { id: 'about',    label: 'About' },
];

const ROLE_OPTIONS: { value: 'pf' | 'pm' | 'observer'; label: string }[] = [
  { value: 'pf',       label: 'Pilot Flying' },
  { value: 'pm',       label: 'Pilot Monitoring' },
  { value: 'observer', label: 'Observer' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [showResetModal, setShowResetModal] = useState(false);

  // Auto-save helper — updates local state (would write to IPC in production)
  const update = useCallback(<K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResetCareer = useCallback(() => {
    update('startingBalance', STARTING_BALANCE);
    update('pilotName', 'Pilot');
    setShowResetModal(false);
  }, [update]);

  return (
    <div className="settings-page animate-fade-in">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Configure AeroSphere Studio to your preferences</p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="settings-body">
        {/* ── General ─────────────────────────── */}
        {activeTab === 'general' && (
          <div className="settings-section animate-fade-in-up">
            <GlassPanel className="settings-card">
              <div className="settings-card__header">
                <span className="settings-card__icon">🎨</span>
                <h2 className="settings-card__title">Appearance</h2>
              </div>
              <div className="settings-row">
                <div className="settings-row__info">
                  <span className="settings-row__label">App Theme</span>
                  <span className="settings-row__hint">Dark mode — the only way to fly</span>
                </div>
                <span className="settings-badge">Dark</span>
              </div>
            </GlassPanel>

            <GlassPanel className="settings-card">
              <div className="settings-card__header">
                <span className="settings-card__icon">📁</span>
                <h2 className="settings-card__title">Community Folder</h2>
              </div>
              <TextInput
                label="Community Folder Path"
                value={settings.communityFolderPath}
                onChange={(v) => update('communityFolderPath', v)}
                placeholder="Auto-detected · or paste path manually"
              />
              <p className="settings-hint">
                Leave empty for auto-detection. The installer checks Registry, Steam, and MS Store paths.
              </p>
            </GlassPanel>

            <GlassPanel className="settings-card">
              <div className="settings-card__header">
                <span className="settings-card__icon">🚀</span>
                <h2 className="settings-card__title">Startup</h2>
              </div>
              <div className="settings-row">
                <div className="settings-row__info">
                  <span className="settings-row__label">Auto-start with Windows</span>
                  <span className="settings-row__hint">Launch AeroSphere when you log in</span>
                </div>
                <Toggle
                  checked={settings.autoStart}
                  onChange={(v) => update('autoStart', v)}
                />
              </div>
            </GlassPanel>
          </div>
        )}

        {/* ── LOD Engine ──────────────────────── */}
        {activeTab === 'lod' && (
          <div className="settings-section animate-fade-in-up">
            <GlassPanel className="settings-card">
              <div className="settings-card__header">
                <span className="settings-card__icon">🎯</span>
                <h2 className="settings-card__title">Performance Target</h2>
              </div>
              <Slider
                label="Target FPS"
                value={settings.lodTargetFPS}
                min={20}
                max={120}
                step={5}
                unit=" fps"
                onChange={(v) => update('lodTargetFPS', v)}
              />
            </GlassPanel>

            <GlassPanel className="settings-card">
              <div className="settings-card__header">
                <span className="settings-card__icon">🏔️</span>
                <h2 className="settings-card__title">Terrain LOD (TLOD)</h2>
              </div>
              <div className="settings-slider-pair">
                <Slider
                  label="Minimum TLOD"
                  value={settings.lodMinTLOD}
                  min={10}
                  max={settings.lodMaxTLOD}
                  step={10}
                  onChange={(v) => update('lodMinTLOD', v)}
                />
                <Slider
                  label="Maximum TLOD"
                  value={settings.lodMaxTLOD}
                  min={settings.lodMinTLOD}
                  max={1000}
                  step={10}
                  onChange={(v) => update('lodMaxTLOD', v)}
                />
              </div>
            </GlassPanel>

            <GlassPanel className="settings-card">
              <div className="settings-card__header">
                <span className="settings-card__icon">🏗️</span>
                <h2 className="settings-card__title">Object LOD (OLOD)</h2>
              </div>
              <div className="settings-slider-pair">
                <Slider
                  label="Minimum OLOD"
                  value={settings.lodMinOLOD}
                  min={10}
                  max={settings.lodMaxOLOD}
                  step={10}
                  onChange={(v) => update('lodMinOLOD', v)}
                />
                <Slider
                  label="Maximum OLOD"
                  value={settings.lodMaxOLOD}
                  min={settings.lodMinOLOD}
                  max={500}
                  step={10}
                  onChange={(v) => update('lodMaxOLOD', v)}
                />
              </div>
            </GlassPanel>
          </div>
        )}

        {/* ── Shared Cockpit ──────────────────── */}
        {activeTab === 'cockpit' && (
          <div className="settings-section animate-fade-in-up">
            <GlassPanel className="settings-card">
              <div className="settings-card__header">
                <span className="settings-card__icon">👨‍✈️</span>
                <h2 className="settings-card__title">Default Role</h2>
              </div>
              <div className="settings-role-select">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`settings-role-btn ${settings.defaultRole === opt.value ? 'settings-role-btn--active' : ''}`}
                    onClick={() => update('defaultRole', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className="settings-card">
              <div className="settings-card__header">
                <span className="settings-card__icon">🌐</span>
                <h2 className="settings-card__title">Signaling Server</h2>
              </div>
              <TextInput
                label="Server URL"
                value={settings.signalingServerUrl}
                onChange={(v) => update('signalingServerUrl', v)}
                placeholder="wss://signal.aerosphere.app"
              />
            </GlassPanel>

            <GlassPanel className="settings-card">
              <div className="settings-card__header">
                <span className="settings-card__icon">🎙️</span>
                <h2 className="settings-card__title">Voice</h2>
              </div>
              <TextInput
                label="Push-to-Talk Key"
                value={settings.pushToTalkKey}
                onChange={(v) => update('pushToTalkKey', v)}
                placeholder="CapsLock"
              />
            </GlassPanel>
          </div>
        )}

        {/* ── Career ─────────────────────────── */}
        {activeTab === 'career' && (
          <div className="settings-section animate-fade-in-up">
            <GlassPanel className="settings-card">
              <div className="settings-card__header">
                <span className="settings-card__icon">✈️</span>
                <h2 className="settings-card__title">Pilot Identity</h2>
              </div>
              <TextInput
                label="Pilot Name"
                value={settings.pilotName}
                onChange={(v) => update('pilotName', v)}
                placeholder="Enter your pilot name"
              />
            </GlassPanel>

            <GlassPanel className="settings-card">
              <div className="settings-card__header">
                <span className="settings-card__icon">💰</span>
                <h2 className="settings-card__title">Finances</h2>
              </div>
              <div className="settings-row">
                <div className="settings-row__info">
                  <span className="settings-row__label">Starting Balance</span>
                  <span className="settings-row__hint">Initial funds when career began</span>
                </div>
                <span className="settings-balance">${settings.startingBalance.toLocaleString()}</span>
              </div>
            </GlassPanel>

            <GlassPanel className="settings-card settings-card--danger">
              <div className="settings-card__header">
                <span className="settings-card__icon">⚠️</span>
                <h2 className="settings-card__title">Danger Zone</h2>
              </div>
              <div className="settings-row">
                <div className="settings-row__info">
                  <span className="settings-row__label">Reset Career</span>
                  <span className="settings-row__hint">Wipe all career progress. This cannot be undone.</span>
                </div>
                <Button variant="danger" size="sm" onClick={() => setShowResetModal(true)}>
                  Reset
                </Button>
              </div>
            </GlassPanel>
          </div>
        )}

        {/* ── About ──────────────────────────── */}
        {activeTab === 'about' && (
          <div className="settings-section animate-fade-in-up">
            <GlassPanel className="settings-card" glow>
              <div className="settings-about">
                <div className="settings-about__logo">✦</div>
                <h2 className="settings-about__name">AeroSphere Studio</h2>
                <span className="settings-about__version">v{APP_VERSION}</span>
                <p className="settings-about__tagline">
                  Dynamic LOD · Shared Cockpit · Virtual Airline
                </p>
                <div className="settings-about__links">
                  <a href="https://aerosphere.app" target="_blank" rel="noreferrer" className="settings-about__link">
                    Website
                  </a>
                  <span className="settings-about__dot">·</span>
                  <a href="https://github.com/aerosphere" target="_blank" rel="noreferrer" className="settings-about__link">
                    GitHub
                  </a>
                  <span className="settings-about__dot">·</span>
                  <a href="https://discord.gg/aerosphere" target="_blank" rel="noreferrer" className="settings-about__link">
                    Discord
                  </a>
                </div>
                <p className="settings-about__credits">
                  Built with Electron · React · SimConnect
                </p>
              </div>
            </GlassPanel>
          </div>
        )}
      </div>

      {/* ── Reset Confirmation Modal ── */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Career?"
      >
        <p className="modal-text">
          This will erase all career progress including flights, balance, XP, and aircraft.
          This action <strong>cannot be undone</strong>.
        </p>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setShowResetModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleResetCareer}>
            Yes, Reset Career
          </Button>
        </div>
      </Modal>
    </div>
  );
}
