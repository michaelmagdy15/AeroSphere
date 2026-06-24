import { useState } from 'react';
import CareerDashboard from '../components/career/CareerDashboard';
import MissionBoard from '../components/career/MissionBoard';
import FlightLog from '../components/career/FlightLog';
import FleetManager from '../components/career/FleetManager';
import AircraftShop from '../components/career/AircraftShop';
import BaseMap from '../components/career/BaseMap';
import './CareerPage.css';
import { useCareer } from '../hooks/useCareer';

const CAREER_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'missions',  label: 'Missions',  icon: '🎯' },
  { id: 'log',       label: 'Flight Log', icon: '📋' },
  { id: 'fleet',     label: 'Fleet',      icon: '✈️' },
  { id: 'shop',      label: 'Shop',       icon: '🛒' },
  { id: 'bases',     label: 'Bases',      icon: '🗺️' },
] as const;

type CareerTabId = (typeof CAREER_TABS)[number]['id'];

/** Set to true to gate this page behind a Pro subscription */
const REQUIRE_PRO = false;
const IS_PRO = false; // TODO: wire to real subscription state

function ProOverlay() {
  return (
    <div className="pro-overlay">
      <span className="pro-overlay__badge">PRO</span>
      <h2 className="pro-overlay__title">Upgrade to Pro</h2>
      <p className="pro-overlay__desc">
        Career Mode requires an AeroSphere Pro subscription.
        Build your airline empire, complete missions, and track your flight history.
      </p>
      <button className="pro-overlay__btn">Upgrade Now</button>
    </div>
  );
}

export default function CareerPage() {
  const [activeTab, setActiveTab] = useState<CareerTabId>('dashboard');
  const career = useCareer();
  const showOverlay = REQUIRE_PRO && !IS_PRO;

  const renderTab = (tab: CareerTabId) => {
    switch (tab) {
      case 'dashboard':
        return (
          <CareerDashboard
            pilot={career.pilot}
            recentFlights={career.flightLog}
            onNavigate={(page) => setActiveTab(page as CareerTabId)}
          />
        );
      case 'missions':
        return (
          <MissionBoard
            missions={career.missions}
            onAcceptMission={career.acceptMission}
          />
        );
      case 'log':
        return <FlightLog flights={career.flightLog} />;
      case 'fleet':
        return <FleetManager />;
      case 'shop':
        return <AircraftShop />;
      case 'bases':
        return <BaseMap />;
    }
  };

  return (
    <div className="career-page-wrapper">
      {showOverlay && <ProOverlay />}

      <div className="career-page">
        {/* ── Sub-navigation ────────────────────────────────── */}
        <nav className="career-nav">
          {CAREER_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`career-nav__tab${activeTab === tab.id ? ' career-nav__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        {/* ── Tab Content ───────────────────────────────────── */}
        <div className="career-content" key={activeTab}>
          {renderTab(activeTab)}
        </div>
      </div>
    </div>
  );
}
