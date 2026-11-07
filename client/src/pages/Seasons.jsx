import { useEffect, useState } from 'react';
import { api, useApi } from '../api.js';
import AddByName from '../components/AddByName.jsx';
import { ErrorAlert } from '../components/Layout.jsx';

export default function Seasons() {
  const leagues = useApi('/leagues');
  const seasons = useApi('/seasons');
  const [leagueId, setLeagueId] = useState('');

  // Like the PHP page, default to the first league
  useEffect(() => {
    if (!leagueId && leagues.data?.length) setLeagueId(String(leagues.data[0].id));
  }, [leagues.data, leagueId]);

  async function addSeason(name) {
    await api.post('/seasons', { leagueId, name });
    seasons.reload();
  }

  return (
    <>
      <h2>Seasons</h2>
      <select className="form-select mb-3" value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
        {leagues.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <AddByName placeholder="Season Name" buttonLabel="Add Season" onAdd={addSeason} disabled={!leagueId} />
      <ErrorAlert error={leagues.error || seasons.error} />
      <table className="table table-striped bg-white">
        <thead><tr><th>League</th><th>Name</th></tr></thead>
        <tbody>
          {seasons.data?.map((s) => (
            <tr key={s.id}><td>{s.leagueName}</td><td>{s.name}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
