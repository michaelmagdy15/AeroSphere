import React from 'react';
import { AircraftProfile } from '@shared/types';
import Button from '../common/Button';
import { GlassPanel } from '../layout/GlassPanel';
import './ProfileBrowser.css';

interface ProfileBrowserProps {
  profiles?: AircraftProfile[];
  filter?: 'mine' | 'community' | 'builtin';
  onFilterChange?: (f: string) => void;
  onSearch?: (q: string) => void;
  onDownload?: (title: string) => void;
  onUpload?: () => void;
}

const SearchIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="7.5" cy="7.5" r="5.5" />
    <path d="M12 12l4 4" />
  </svg>
);

const DownloadIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 2v8M3.5 7.5L7 11l3.5-3.5M2 13h10" />
  </svg>
);

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill={filled ? 'var(--accent-amber)' : 'none'} stroke={filled ? 'var(--accent-amber)' : 'var(--text-muted)'} strokeWidth="1.2">
    <path d="M7 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.57l-3.52 1.78.67-3.93L1.3 5.64l3.94-.57L7 1.5z" />
  </svg>
);

const AirplaneIcon: React.FC = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.15" className="profile-browser__plane-svg">
    <path d="M24 4L20 18H8l-4 6h16l-4 16h8l8-16h12l4-6H28L24 4z" fill="var(--text-muted)" />
  </svg>
);

const filters: Array<{ key: 'mine' | 'community' | 'builtin'; label: string }> = [
  { key: 'mine', label: 'My Profiles' },
  { key: 'community', label: 'Community' },
  { key: 'builtin', label: 'Built-in' },
];

const mockProfiles: AircraftProfile[] = [
  { aircraftTitle: 'Boeing 737-800', title: 'Boeing 737-800', version: 1, createdAt: new Date().toISOString(), verified: true, mappings: [], id: '1', author: 'PMDG', rating: 4.8, downloads: 12400, filter: 'community' },
  { aircraftTitle: 'Airbus A320neo', title: 'Airbus A320neo', version: 1, createdAt: new Date().toISOString(), verified: true, mappings: [], id: '2', author: 'Fenix Simulations', rating: 4.9, downloads: 9870, filter: 'community' },
  { aircraftTitle: 'Cessna 172', title: 'Cessna 172', version: 1, createdAt: new Date().toISOString(), verified: true, mappings: [], id: '3', author: 'AeroSphere', rating: 4.5, downloads: 7200, filter: 'builtin' },
  { aircraftTitle: 'CRJ-700', title: 'CRJ-700', version: 1, createdAt: new Date().toISOString(), verified: true, mappings: [], id: '4', author: 'Aerosoft', rating: 4.3, downloads: 3100, filter: 'community' },
  { aircraftTitle: 'Fenix A320', title: 'Fenix A320', version: 1, createdAt: new Date().toISOString(), verified: true, mappings: [], id: '5', author: 'CaptainSim', rating: 4.7, downloads: 5600, filter: 'mine' },
  { aircraftTitle: 'PMDG 777-300ER', title: 'PMDG 777-300ER', version: 1, createdAt: new Date().toISOString(), verified: true, mappings: [], id: '6', author: 'PMDG', rating: 4.9, downloads: 15200, filter: 'community' },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const ProfileBrowser: React.FC<ProfileBrowserProps> = ({
  profiles,
  filter = 'community',
  onFilterChange,
  onSearch,
  onDownload,
  onUpload,
}) => {
  const allProfiles = profiles ?? mockProfiles;
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState(filter);

  const handleFilterChange = (f: string) => {
    setActiveFilter(f as typeof activeFilter);
    onFilterChange?.(f);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    onSearch?.(q);
  };

  const filteredProfiles = allProfiles.filter((p) => {
    const matchesFilter = (p as any).filter === activeFilter || !((p as any).filter);
    const matchesSearch = !searchQuery || (p.title ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="profile-browser animate-fade-in">
      {/* Header */}
      <div className="profile-browser__header">
        <h3 className="profile-browser__title">Aircraft Profiles</h3>
        {activeFilter === 'mine' && (
          <Button variant="primary" size="sm" onClick={onUpload}>
            Upload Profile
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="profile-browser__search animate-fade-in stagger-1">
        <span className="profile-browser__search-icon">
          <SearchIcon />
        </span>
        <input
          className="profile-browser__search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search profiles…"
        />
      </div>

      {/* Filter pills */}
      <div className="profile-browser__filters animate-fade-in stagger-2">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`profile-browser__filter-pill ${activeFilter === f.key ? 'profile-browser__filter-pill--active' : ''}`}
            onClick={() => handleFilterChange(f.key)}
            type="button"
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredProfiles.length > 0 ? (
        <div className="profile-browser__grid">
          {filteredProfiles.map((p, i) => (
            <GlassPanel key={(p as any).id ?? i} className={`profile-browser__card hover-lift stagger-${Math.min(i + 1, 6)}`}>
              <div className="profile-browser__card-thumb">
                <AirplaneIcon />
              </div>
              <div className="profile-browser__card-body">
                <h4 className="profile-browser__card-title">{p.title}</h4>
                <p className="profile-browser__card-author">by {(p as any).author ?? 'Unknown'}</p>
                <div className="profile-browser__card-meta">
                  <div className="profile-browser__stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon key={star} filled={star <= Math.round((p as any).rating ?? 0)} />
                    ))}
                  </div>
                  <span className="profile-browser__downloads">
                    <DownloadIcon /> {formatCount((p as any).downloads ?? 0)}
                  </span>
                </div>
                {activeFilter === 'community' && (
                  <Button variant="secondary" size="sm" onClick={() => onDownload?.(p.aircraftTitle)}>
                    Download
                  </Button>
                )}
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : (
        <div className="profile-browser__empty animate-fade-in-up">
          <SearchIcon size={48} />
          <h4 className="profile-browser__empty-title">No profiles found</h4>
          <p className="profile-browser__empty-text">Try adjusting your search or filter.</p>
        </div>
      )}
    </div>
  );
};

export default ProfileBrowser;
