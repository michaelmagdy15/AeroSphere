import { useState, useMemo } from 'react';
import { Button } from '../common/Button';
import { GlassPanel } from '../layout/GlassPanel';
import { useCareer } from '../../hooks/useCareer';
import './AircraftShop.css';

interface CatalogAircraft {
  type_id: number;
  name: string;
  category: string;
  speed_kts: number;
  range_nm: number;
  capacity: number;
  price: number;
  image_emoji: string;
}

const AIRCRAFT_CATALOG: CatalogAircraft[] = [
  { type_id: 1, name: 'Cessna 172', category: 'Single Engine', speed_kts: 124, range_nm: 640, capacity: 3, price: 28000, image_emoji: '🛩️' },
  { type_id: 7, name: 'Piper Cherokee', category: 'Single Engine', speed_kts: 128, range_nm: 520, capacity: 3, price: 22000, image_emoji: '🛩️' },
  { type_id: 2, name: 'Beechcraft Baron', category: 'Twin Engine', speed_kts: 200, range_nm: 1200, capacity: 5, price: 85000, image_emoji: '✈️' },
  { type_id: 8, name: 'Diamond DA42', category: 'Twin Engine', speed_kts: 180, range_nm: 1060, capacity: 3, price: 65000, image_emoji: '✈️' },
  { type_id: 3, name: 'King Air 350', category: 'Turboprop', speed_kts: 312, range_nm: 1800, capacity: 11, price: 320000, image_emoji: '🛫' },
  { type_id: 4, name: 'Citation CJ4', category: 'Light Jet', speed_kts: 451, range_nm: 2165, capacity: 9, price: 850000, image_emoji: '🛩️' },
  { type_id: 5, name: 'Gulfstream G550', category: 'Heavy Jet', speed_kts: 488, range_nm: 6750, capacity: 18, price: 2400000, image_emoji: '✈️' },
  { type_id: 6, name: 'Boeing 737-800', category: 'Airliner', speed_kts: 453, range_nm: 2935, capacity: 189, price: 8500000, image_emoji: '🛫' },
];

const CATEGORIES = ['All', 'Single Engine', 'Twin Engine', 'Turboprop', 'Light Jet', 'Heavy Jet', 'Airliner'];

export default function AircraftShop() {
  const { pilot } = useCareer();
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = useMemo(() => {
    if (activeCategory === 'All') return AIRCRAFT_CATALOG;
    return AIRCRAFT_CATALOG.filter((ac) => ac.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="aircraft-shop">
      <div className="aircraft-shop__header">
        <h1 className="aircraft-shop__title">Aircraft Shop</h1>
        <span className="aircraft-shop__balance">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          ${pilot.balance.toLocaleString()}
        </span>
      </div>

      {/* Category Tabs */}
      <div className="aircraft-shop__tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`aircraft-shop__tab ${activeCategory === cat ? 'aircraft-shop__tab--active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Aircraft Grid */}
      <div className="aircraft-shop__grid">
        {filtered.map((ac) => {
          const canAfford = pilot.balance >= ac.price;
          return (
            <GlassPanel key={ac.type_id} className="aircraft-shop__card">
              <div className="aircraft-shop__card-icon">{ac.image_emoji}</div>
              <h3 className="aircraft-shop__card-name">{ac.name}</h3>
              <span className="aircraft-shop__card-category">{ac.category}</span>

              <div className="aircraft-shop__specs">
                <div className="aircraft-shop__spec-item">
                  <span className="aircraft-shop__spec-label">Speed</span>
                  <span className="aircraft-shop__spec-value">{ac.speed_kts} kts</span>
                </div>
                <div className="aircraft-shop__spec-item">
                  <span className="aircraft-shop__spec-label">Range</span>
                  <span className="aircraft-shop__spec-value">{ac.range_nm.toLocaleString()} nm</span>
                </div>
                <div className="aircraft-shop__spec-item">
                  <span className="aircraft-shop__spec-label">Capacity</span>
                  <span className="aircraft-shop__spec-value">{ac.capacity} pax</span>
                </div>
                <div className="aircraft-shop__spec-item">
                  <span className="aircraft-shop__spec-label">Price</span>
                  <span className="aircraft-shop__spec-value">${ac.price.toLocaleString()}</span>
                </div>
              </div>

              <div className="aircraft-shop__price">${ac.price.toLocaleString()}</div>

              <Button
                variant={canAfford ? 'primary' : 'ghost'}
                size="sm"
                disabled={!canAfford}
                className="aircraft-shop__buy-btn"
              >
                {canAfford ? 'Purchase' : 'Insufficient Funds'}
              </Button>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}
