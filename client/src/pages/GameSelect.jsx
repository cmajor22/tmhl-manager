import { useNavigate } from 'react-router-dom';
import { useApi } from '../api.js';
import LeagueSeasonPicker, { useLeagueSeason } from '../components/LeagueSeasonPicker.jsx';
import { ErrorAlert } from '../components/Layout.jsx';
import TeamMark from '../components/TeamMark.jsx';
import { teamFrom } from '../teamStyle.js';

// gameSelect.php — pick a game to enter goals/penalties for
export default function GameSelect() {
  const picker = useLeagueSeason();
  const { seasonId, query } = picker;
  const games = useApi(seasonId ? `/games?seasonId=${encodeURIComponent(seasonId)}&order=upload` : null);
  const navigate = useNavigate();

  return (
    <>
      <h2>Upload Game Data</h2>
      <LeagueSeasonPicker {...picker} autoSelectLatest />
      <ErrorAlert error={games.error} />
      {seasonId && (
        <>
          <p>Click a row to upload Game Data</p>
          <table className="table table-hover bg-white">
            <thead><tr><th>Date</th><th>Time</th><th>Home</th><th>Away</th><th>Status</th></tr></thead>
            <tbody>
              {games.data?.map((g) => (
                <tr key={g.id} className="clickable-row" onClick={() => navigate(`/game-data/${g.id}?${query}`)}>
                  <td>{g.date}</td><td>{g.time}</td>
                  {['home', 'away'].map((side) => (
                    <td key={side}>
                      <span className="d-inline-flex align-items-center gap-2">
                        <TeamMark team={teamFrom(g, side)} size={22} /> {g[`${side}Name`]}
                      </span>
                    </td>
                  ))}
                  <td>{g.uploaded ? <span className="badge bg-success">Uploaded</span> : <span className="badge bg-secondary">Pending</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
