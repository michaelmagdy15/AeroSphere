import { useState } from 'react';
import { GlassPanel } from '../components/layout/GlassPanel';
import ConnectionPanel from '../components/cockpit/ConnectionPanel';
import RoleSelector from '../components/cockpit/RoleSelector';
import AutoLearnPanel from '../components/cockpit/AutoLearnPanel';
import ProfileBrowser from '../components/cockpit/ProfileBrowser';
import VoIPControls from '../components/cockpit/VoIPControls';
import SyncStatus from '../components/cockpit/SyncStatus';
import './CockpitPage.css';
import { useVoIP } from '../hooks/useVoIP';

const TABS = ['Auto-Learn', 'Profiles'] as const;
type CockpitTab = (typeof TABS)[number];

/** Set to true to gate this page behind a Pro subscription */
const REQUIRE_PRO = false;
const IS_PRO = false; // TODO: wire to real subscription state

function ProOverlay() {
  return (
    <div className="pro-overlay">
      <span className="pro-overlay__badge">PRO</span>
      <h2 className="pro-overlay__title">Upgrade to Pro</h2>
      <p className="pro-overlay__desc">
        Shared Cockpit requires an AeroSphere Pro subscription.
        Fly with friends, share controls, and communicate in real-time.
      </p>
      <button className="pro-overlay__btn">Upgrade Now</button>
    </div>
  );
}

export default function CockpitPage() {
  const [activeTab, setActiveTab] = useState<CockpitTab>('Auto-Learn');
  const voip = useVoIP();
  const showOverlay = REQUIRE_PRO && !IS_PRO;

  return (
    <div className="cockpit-page-wrapper">
      {showOverlay && <ProOverlay />}

      <div className="cockpit-page">
        {/* ── Top Grid ──────────────────────────────────────── */}
        <div className="cockpit-grid">
          {/* Left Column */}
          <div className="cockpit-col">
            <GlassPanel className="cockpit-panel animate-fade-in-up stagger-1">
              <span className="cockpit-panel__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Connection
              </span>
              <ConnectionPanel />
            </GlassPanel>

            <GlassPanel className="cockpit-panel animate-fade-in-up stagger-2">
              <span className="cockpit-panel__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="7" r="4" />
                  <path d="M5.5 21a6.5 6.5 0 0113 0" />
                </svg>
                Role
              </span>
              <RoleSelector />
            </GlassPanel>
          </div>

          {/* Right Column */}
          <div className="cockpit-col">
            <GlassPanel className="cockpit-panel animate-fade-in-up stagger-3">
              <span className="cockpit-panel__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                Sync Status
              </span>
              <SyncStatus />
            </GlassPanel>

            <GlassPanel className="cockpit-panel animate-fade-in-up stagger-4">
              <span className="cockpit-panel__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                </svg>
                VoIP
              </span>
              <VoIPControls
                isMuted={voip.isMuted}
                isSpeaking={voip.isSpeaking}
                volume={voip.volume}
                isPushToTalk={voip.isPushToTalk}
                isRadioCrackle={voip.isRadioCrackle}
                onToggleMute={voip.toggleMute}
                onVolumeChange={voip.setVolume}
                onTogglePTT={voip.setPushToTalk}
                onToggleCrackle={voip.setRadioCrackle}
              />
            </GlassPanel>
          </div>
        </div>

        {/* ── Tab Strip ─────────────────────────────────────── */}
        <div className="cockpit-tabs animate-fade-in-up stagger-5">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`cockpit-tab${activeTab === tab ? ' cockpit-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab Content ───────────────────────────────────── */}
        <div className="cockpit-tab-content" key={activeTab}>
          {activeTab === 'Auto-Learn' ? <AutoLearnPanel /> : <ProfileBrowser />}
        </div>
      </div>
    </div>
  );
}
