import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../api.js';

/**
 * League -> Season cascading dropdowns, used by Teams, Games and Game Data.
 * The selection lives in the URL (?league=&season=) so it survives navigating
 * into a team/game and coming back.
 */
export function useLeagueSeason() {
  const [params, setParams] = useSearchParams();
  const leagueId = params.get('league') || '';
  const seasonId = params.get('season') || '';

  const setLeagueId = (id) => setParams(id ? { league: id } : {}, { replace: true });
  const setSeasonId = (id) => setParams(id ? { league: leagueId, season: id } : { league: leagueId }, { replace: true });

  return { leagueId, seasonId, setLeagueId, setSeasonId, query: params.toString() };
}

/**
 * autoSelectLatest: once a league is picked and no season is chosen yet, select
 * that league's most recently created season (highest id).
 */
export default function LeagueSeasonPicker({ leagueId, seasonId, setLeagueId, setSeasonId, autoSelectLatest = false }) {
  const leagues = useApi('/leagues');
  const seasons = useApi(leagueId ? `/seasons?leagueId=${encodeURIComponent(leagueId)}` : null);

  useEffect(() => {
    if (!autoSelectLatest || !leagueId || seasonId || !seasons.data?.length) return;
    // Ignore a stale list still loaded from the previously selected league.
    if (String(seasons.data[0].leagueId) !== String(leagueId)) return;
    const latest = seasons.data.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a));
    setSeasonId(String(latest.id));
  }, [autoSelectLatest, leagueId, seasonId, seasons.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mb-3">
      <select className="form-select mb-2" value={leagueId} onChange={(e) => setLeagueId(e.target.value)}>
        <option value="">Select League</option>
        {leagues.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <select className="form-select" value={seasonId} onChange={(e) => setSeasonId(e.target.value)} disabled={!leagueId}>
        <option value="">Select Season</option>
        {seasons.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  );
}
