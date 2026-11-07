import { useEffect, useState } from 'react';
import { api, useApi } from '../api.js';
import LeagueSeasonPicker, { useLeagueSeason } from '../components/LeagueSeasonPicker.jsx';
import { ErrorAlert } from '../components/Layout.jsx';
import TeamMark from '../components/TeamMark.jsx';

const emptyForm = { date: '', time: '', isPlayoffs: false, homeId: '', awayId: '' };

// Teams come back in creation order; their 1-based position is the season index used for review.
const teamOptions = (teams) =>
  teams.map((t, i) => <option key={t.id} value={t.id}>{i + 1} - {t.name}</option>);

const fromGame =(g) => ({ date: g.date ?? '', time: g.time ?? '', homeId: String(g.homeId), awayId: String(g.awayId) });

// One editable games-grid row. Date/time save on blur or Enter; teams save on change.
// Rows don't re-sort after an edit so they don't jump around while you work.
function GameRow({ game, teams }) {
  const [saved, setSaved] = useState(() => fromGame(game));
  const [values, setValues] = useState(saved);
  const [status, setStatus] = useState(null); // { field, ok } | { error }

  useEffect(() => {
    const v = fromGame(game);
    setSaved(v);
    setValues(v);
  }, [game]);

  async function save(field, value) {
    const v = String(value).trim();
    if (v === saved[field]) return setValues((x) => ({ ...x, [field]: saved[field] }));
    const revert = (error) => {
      setValues((x) => ({ ...x, [field]: saved[field] }));
      setStatus({ error });
    };
    if (!v) return revert(`${field === 'date' ? 'Date' : 'Time'} cannot be blank`);
    if (field === 'homeId' && v === values.awayId) return revert('Teams must be different');
    if (field === 'awayId' && v === values.homeId) return revert('Teams must be different');

    setValues((x) => ({ ...x, [field]: v }));
    setStatus({ field, saving: true });
    try {
      await api.patch(`/games/${game.id}`, { [field]: v });
      setSaved((x) => ({ ...x, [field]: v }));
      setStatus({ field, ok: true });
      setTimeout(() => setStatus((s) => (s?.field === field && s.ok ? null : s)), 1500);
    } catch (err) {
      revert(err.message);
    }
  }

  const cls = (field, base) => `${base} ${base}-sm${status?.field === field && status.ok ? ' is-valid' : ''}`;
  const textProps = (field) => ({
    value: values[field],
    disabled: status?.field === field && status.saving,
    onChange: (e) => { setValues({ ...values, [field]: e.target.value }); setStatus(null); },
    onBlur: (e) => save(field, e.target.value),
    onKeyDown: (e) => {
      if (e.key === 'Enter') e.currentTarget.blur();
      if (e.key === 'Escape') {
        setValues({ ...values, [field]: saved[field] });
        setStatus(null);
        setTimeout(() => e.target.blur());
      }
    },
  });
  const teamSelect = (field, label) => (
    <select
      className={cls(field, 'form-select')}
      aria-label={label}
      value={values[field]}
      disabled={status?.field === field && status.saving}
      onChange={(e) => save(field, e.target.value)}
    >
      {teamOptions(teams)}
    </select>
  );

  return (
    <>
      <tr>
        <td><input type="date" aria-label="Date" className={cls('date', 'form-control')} {...textProps('date')} /></td>
        <td><input aria-label="Time" className={cls('time', 'form-control')} style={{ width: 90 }} {...textProps('time')} /></td>
        {[['homeId', 'Home team'], ['awayId', 'Away team']].map(([field, label]) => (
          <td key={field}>
            {/* Logo follows the dropdown, so it updates as soon as you pick a different team */}
            <div className="d-flex align-items-center gap-2">
              <TeamMark team={teams.find((t) => String(t.id) === values[field])} size={24} />
              {teamSelect(field, label)}
            </div>
          </td>
        ))}
      </tr>
      {status?.error && (
        <tr><td colSpan={4} className="text-danger small py-1">{status.error}</td></tr>
      )}
    </>
  );
}

export default function Games() {
  const picker = useLeagueSeason();
  const { seasonId } = picker;
  const q = seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : null;
  const games = useApi(q && `/games${q}`);
  const teams = useApi(q && `/teams${q}`);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  // Default home/away to the first team, like the PHP dropdowns did
  useEffect(() => {
    const first = teams.data?.[0]?.id;
    setForm((f) => ({ ...f, homeId: first ? String(first) : '', awayId: first ? String(first) : '' }));
  }, [teams.data]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function addGame(e) {
    e.preventDefault();
    setError('');
    if (!seasonId) return setError('Season must be selected');
    if (form.homeId === form.awayId) return setError('Teams must be different');
    if (!form.date) return setError('Game date must be entered');
    if (!form.time) return setError('Game time must be entered');
    try {
      await api.post('/games', { ...form, seasonId });
      setForm((f) => ({ ...f, time: '' }));
      games.reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h2>Games</h2>
      <LeagueSeasonPicker {...picker} autoSelectLatest />

      {seasonId && (
        <form className="mb-4" onSubmit={addGame}>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="row g-2 mb-2">
            <div className="col-sm">
              <label className="form-label">Date</label>
              <input type="date" className="form-control" value={form.date} onChange={set('date')} />
            </div>
            <div className="col-sm">
              <label className="form-label">Time</label>
              <input className="form-control" placeholder="Game Time" value={form.time} onChange={set('time')} />
            </div>
          </div>
          <div className="row g-2 mb-2">
            <div className="col-sm">
              <label className="form-label">Home</label>
              <select className="form-select" value={form.homeId} onChange={set('homeId')}>
                {teamOptions(teams.data ?? [])}
              </select>
            </div>
            <div className="col-sm">
              <label className="form-label">Away</label>
              <select className="form-select" value={form.awayId} onChange={set('awayId')}>
                {teamOptions(teams.data ?? [])}
              </select>
            </div>
          </div>
          <div className="form-check mb-3">
            <input id="isPlayoffs" type="checkbox" className="form-check-input" checked={form.isPlayoffs} onChange={set('isPlayoffs')} />
            <label htmlFor="isPlayoffs" className="form-check-label">Playoff Game?</label>
          </div>
          <button type="submit" className="btn btn-primary nav-btn">Add Game</button>
        </form>
      )}

      <ErrorAlert error={games.error || teams.error} />
      {seasonId && (
        <table className="table table-striped bg-white">
          <thead><tr><th>Date</th><th>Time</th><th>Home</th><th>Away</th></tr></thead>
          <tbody>
            {games.data?.map((g) => <GameRow key={g.id} game={g} teams={teams.data ?? []} />)}
          </tbody>
        </table>
      )}
    </>
  );
}
