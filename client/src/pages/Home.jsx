import { Link } from 'react-router-dom';

// Minimal stroke icons (24x24, currentColor) so no icon package is needed.
const paths = {
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  printer: 'M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
};

function Icon({ name, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

const setup = [
  { label: 'Leagues', to: '/leagues', icon: 'trophy', desc: 'Divisions like 19+ Sunday and 40+' },
  { label: 'Seasons', to: '/seasons', icon: 'calendar', desc: 'Create a season within a league' },
  { label: 'Teams', to: '/teams', icon: 'shield', desc: 'Teams, rosters, numbers and captains' },
  { label: 'Games', to: '/games', icon: 'clock', desc: 'Build and edit the season schedule' },
  { label: 'Players', to: '/players', icon: 'users', desc: 'Names, ratings, positions and status' },
];

const print = [
  { label: 'Player Cards', badge: '19+', to: '/player-cards/19', desc: 'Draft cards for active 19+ players' },
  { label: 'Player Cards', badge: '40+', to: '/player-cards/40', desc: 'Draft cards for active 40+ players' },
];

function TileLink({ to, icon, label, badge, desc }) {
  return (
    <Link to={to} className="home-tile">
      <span className="home-tile-icon"><Icon name={icon} /></span>
      <span className="home-tile-body">
        <span className="home-tile-title">
          {label}
          {badge && <span className="badge rounded-pill home-tile-badge ms-2">{badge}</span>}
        </span>
        <span className="home-tile-desc">{desc}</span>
      </span>
      <span className="home-tile-arrow"><Icon name="arrow" size={18} /></span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="home">
      <header className="mb-4">
        <h1 className="home-title">Dashboard</h1>
        <p className="text-secondary mb-0">Manage leagues, schedules and game results.</p>
      </header>

      <Link to="/game-data" className="home-hero mb-5">
        <span className="home-hero-icon"><Icon name="upload" size={28} /></span>
        <span className="flex-grow-1">
          <span className="home-hero-title">Upload Game Data</span>
          <span className="home-hero-desc">Enter goals, assists and penalties for a played game</span>
        </span>
        <span className="home-hero-cta">
          Start <Icon name="arrow" size={18} />
        </span>
      </Link>

      <section className="mb-5">
        <h2 className="home-section-label">Setup</h2>
        <div className="home-grid">
          {setup.map((item) => <TileLink key={item.to} {...item} />)}
        </div>
      </section>

      <section>
        <h2 className="home-section-label">Print</h2>
        <div className="home-grid">
          {print.map((item) => <TileLink key={item.to} icon="printer" {...item} />)}
        </div>
      </section>
    </div>
  );
}
