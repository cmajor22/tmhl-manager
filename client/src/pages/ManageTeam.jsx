import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, useApi } from '../api.js';
import { ErrorAlert } from '../components/Layout.jsx';
import TeamMark from '../components/TeamMark.jsx';
import { teamAccent } from '../teamStyle.js';

const emptyForm = { playerId: '', number: '', isCaptain: false, isGoalie: false };

// Jersey number edited in place: saves on blur or Enter, Escape reverts.
function NumberCell({ entry }) {
  const [saved, setSaved] = useState(entry.number ?? '');
  const [value, setValue] = useState(saved);
  const [status, setStatus] = useState(null); // 'saving' | 'saved' | error message

  useEffect(() => {
    setSaved(entry.number ?? '');
    setValue(entry.number ?? '');
  }, [entry.number]);

  async function save() {
    const number = String(value).trim();
    if (number === String(saved)) return setValue(saved);
    if (!number) {
      setValue(saved);
      return setStatus('Number cannot be blank');
    }
    setStatus('saving');
    try {
      await api.patch(`/roster/${entry.id}`, { number });
      setSaved(number);
      setValue(number);
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? null : s)), 1500);
    } catch (err) {
      setValue(saved);
      setStatus(err.message);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') {
      setValue(saved);
      setStatus(null);
      setTimeout(() => e.target.blur());
    }
  }

  const isError = status && status !== 'saving' && status !== 'saved';
  return (
    <div className="d-inline-flex flex-column align-items-center">
      <input
        className={`form-control form-control-sm text-center${isError ? ' is-invalid' : ''}${status === 'saved' ? ' is-valid' : ''}`}
        style={{ width: 80 }}
        value={value}
        aria-label={`Number for ${entry.name}`}
        disabled={status === 'saving'}
        onChange={(e) => { setValue(e.target.value); setStatus(null); }}
        onBlur={save}
        onKeyDown={onKeyDown}
      />
      {isError && <small className="text-danger">{status}</small>}
    </div>
  );
}

// Captain/goalie checkbox saved as soon as it's toggled; reverts if the save fails.
function FlagCell({ entry, field, label }) {
  const [checked, setChecked] = useState(Number(entry[field]) === 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setChecked(Number(entry[field]) === 1), [entry, field]);

  async function toggle(e) {
    const next = e.target.checked;
    setChecked(next);
    setSaving(true);
    setError('');
    try {
      await api.patch(`/roster/${entry.id}`, { [field]: next });
    } catch (err) {
      setChecked(!next);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="d-inline-flex flex-column align-items-center">
      <input
        type="checkbox"
        className={`form-check-input${error ? ' is-invalid' : ''}`}
        checked={checked}
        disabled={saving}
        aria-label={`${label}: ${entry.name}`}
        onChange={toggle}
      />
      {error && <small className="text-danger">{error}</small>}
    </div>
  );
}

export default function ManageTeam() {
  const { teamId } = useParams();
  const team = useApi(`/teams/${teamId}`);
  const roster = useApi(`/teams/${teamId}/roster`);
  const players = useApi('/players?sort=name');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function addPlayer(e) {
    e.preventDefault();
    setError('');
    if (!form.playerId) return setError('You must select a player to add');
    if (!form.number) return setError('You must enter a jersey number to add');
    try {
      await api.post(`/teams/${teamId}/roster`, form);
      setForm(emptyForm);
      roster.reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="team-header mb-3"
        style={{ '--team-color': team.data ? teamAccent(team.data.primaryColour, team.data.secondaryColour, '#adb5bd') : undefined }}>
        {team.data && <TeamMark team={team.data} size={48} />}
        <h2 className="mb-0">{team.data?.name ?? 'Team'}</h2>
      </div>
      <form className="mb-4" onSubmit={addPlayer}>
        {error && <div className="alert alert-danger">{error}</div>}
        <select className="form-select mb-2" value={form.playerId} onChange={set('playerId')}>
          <option value="">Select Player</option>
          {players.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className="form-control mb-2" placeholder="Player Number" value={form.number} onChange={set('number')} />
        <div className="form-check form-check-inline">
          <input id="isCaptain" className="form-check-input" type="checkbox" checked={form.isCaptain} onChange={set('isCaptain')} />
          <label htmlFor="isCaptain" className="form-check-label">Captain?</label>
        </div>
        <div className="form-check form-check-inline mb-3">
          <input id="isGoalie" className="form-check-input" type="checkbox" checked={form.isGoalie} onChange={set('isGoalie')} />
          <label htmlFor="isGoalie" className="form-check-label">Goalie?</label>
        </div>
        <div><button type="submit" className="btn btn-primary nav-btn">Add Player</button></div>
      </form>

      <ErrorAlert error={roster.error} />
      <table className="table table-striped bg-white">
        <thead><tr><th>Player</th><th>Number</th><th>Captain</th><th>Goalie</th></tr></thead>
        <tbody>
          {roster.data?.map((r) => (
            <tr key={r.id}>
              <td className="align-middle">{r.name}</td>
              <td className="text-center"><NumberCell entry={r} /></td>
              <td className="text-center align-middle"><FlagCell entry={r} field="isCaptain" label="Captain" /></td>
              <td className="text-center align-middle"><FlagCell entry={r} field="isGoalie" label="Goalie" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
