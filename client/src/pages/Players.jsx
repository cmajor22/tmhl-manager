import { useEffect, useState } from 'react';
import { api, useApi } from '../api.js';
import AddByName from '../components/AddByName.jsx';
import { ErrorAlert } from '../components/Layout.jsx';

const textFields = ['name', 'latestRating19', 'latestRating40', 'position'];
const flagFields = ['isActive', 'isActive40'];

const fromPlayer = (p) => ({
  ...Object.fromEntries(textFields.map((f) => [f, p[f] ?? ''])),
  ...Object.fromEntries(flagFields.map((f) => [f, Number(p[f]) === 1])),
});

// One editable players-grid row. Text saves on blur or Enter (Escape reverts);
// checkboxes save as soon as they're toggled. Only name is required.
function PlayerRow({ player }) {
  const [saved, setSaved] = useState(() => fromPlayer(player));
  const [values, setValues] = useState(saved);
  const [status, setStatus] = useState(null); // { field, saving|ok } | { error }

  useEffect(() => {
    const v = fromPlayer(player);
    setSaved(v);
    setValues(v);
  }, [player]);

  async function save(field, raw) {
    const value = typeof raw === 'string' ? raw.trim() : raw;
    if (value === saved[field]) return setValues((x) => ({ ...x, [field]: saved[field] }));
    if (field === 'name' && !value) {
      setValues((x) => ({ ...x, name: saved.name }));
      return setStatus({ error: 'Name cannot be blank' });
    }

    setValues((x) => ({ ...x, [field]: value }));
    setStatus({ field, saving: true });
    try {
      await api.patch(`/players/${player.id}`, { [field]: value });
      setSaved((x) => ({ ...x, [field]: value }));
      // Keep the loaded record in sync so the row shows saved values if a filter
      // hides and re-shows it, and so the filters see the change. Deliberately not
      // state: a row you just marked inactive stays put until the filters change.
      player[field] = typeof value === 'boolean' ? (value ? 1 : 0) : value || null;
      setStatus({ field, ok: true });
      setTimeout(() => setStatus((s) => (s?.field === field && s.ok ? null : s)), 1500);
    } catch (err) {
      setValues((x) => ({ ...x, [field]: saved[field] }));
      setStatus({ error: err.message });
    }
  }

  const busy = (field) => status?.field === field && status.saving;
  const ok = (field) => status?.field === field && status.ok;

  const text = (field, label, width) => (
    <input
      className={`form-control form-control-sm${ok(field) ? ' is-valid' : ''}`}
      style={width ? { width } : undefined}
      aria-label={`${label}: ${saved.name}`}
      list={field === 'position' ? 'position-options' : undefined}
      value={values[field]}
      disabled={busy(field)}
      onChange={(e) => { setValues({ ...values, [field]: e.target.value }); setStatus(null); }}
      onBlur={(e) => save(field, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setValues({ ...values, [field]: saved[field] });
          setStatus(null);
          setTimeout(() => e.target.blur());
        }
      }}
    />
  );

  const check = (field, label) => (
    <input
      type="checkbox"
      className="form-check-input"
      aria-label={`${label}: ${saved.name}`}
      checked={values[field]}
      disabled={busy(field)}
      onChange={(e) => save(field, e.target.checked)}
    />
  );

  return (
    <>
      <tr>
        <td>{text('name', 'Name')}</td>
        <td className="text-center align-middle">{check('isActive', '19+ active')}</td>
        <td>{text('latestRating19', '19+ rating', 110)}</td>
        <td className="text-center align-middle">{check('isActive40', '40+ active')}</td>
        <td>{text('latestRating40', '40+ rating', 110)}</td>
        <td>{text('position', 'Position', 80)}</td>
      </tr>
      {status?.error && (
        <tr><td colSpan={6} className="text-danger small py-1">{status.error}</td></tr>
      )}
    </>
  );
}

const matchesFlag = (value, filter) => filter === 'all' || (Number(value) === 1) === (filter === 'active');

function FlagFilter({ id, label, value, onChange }) {
  return (
    <div className="col-6 col-md-3">
      <label htmlFor={id} className="form-label small mb-1">{label}</label>
      <select id={id} className="form-select form-select-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}

export default function Players() {
  const players = useApi('/players?sort=name');
  const [search, setSearch] = useState('');
  const [active19, setActive19] = useState('all');
  const [active40, setActive40] = useState('all');

  const term = search.trim().toLowerCase();
  const shown = (players.data ?? []).filter((p) =>
    (!term || (p.name ?? '').toLowerCase().includes(term))
    && matchesFlag(p.isActive, active19)
    && matchesFlag(p.isActive40, active40));

  async function addPlayer(name) {
    await api.post('/players', { name });
    players.reload();
  }

  return (
    <>
      <h2>Players</h2>
      <AddByName placeholder="Player Name" buttonLabel="Add Player" onAdd={addPlayer} />
      <ErrorAlert error={players.error} />
      <div className="row g-2 align-items-end mb-2">
        <div className="col-12 col-md-6">
          <label htmlFor="player-search" className="form-label small mb-1">Search names</label>
          <input
            id="player-search"
            type="search"
            className="form-control form-control-sm"
            placeholder="Type part of a name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FlagFilter id="filter-active19" label="19+" value={active19} onChange={setActive19} />
        <FlagFilter id="filter-active40" label="40+" value={active40} onChange={setActive40} />
      </div>
      {players.data && (
        <p className="small text-muted mb-2">Showing {shown.length} of {players.data.length} players</p>
      )}
      <datalist id="position-options">
        <option value="F" /><option value="D" /><option value="G" /><option value="F/D" />
      </datalist>
      <div className="table-responsive">
        <table className="table table-striped table-sm bg-white">
          <thead>
            <tr>
              <th>Name</th><th>19+ Active</th><th>19+ Rating</th><th>40+ Active</th><th>40+ Rating</th><th>Position</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => <PlayerRow key={p.id} player={p} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}
