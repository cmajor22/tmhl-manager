import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../api.js';
import LeagueSeasonPicker, { useLeagueSeason } from '../components/LeagueSeasonPicker.jsx';
import { ErrorAlert } from '../components/Layout.jsx';
import TeamMark from '../components/TeamMark.jsx';
import { teamAccent } from '../teamStyle.js';

const PencilIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />
  </svg>
);

const emptyForm = { name: '', shortForm: '', primaryColour: '#1B2330', secondaryColour: '#FFFFFF' };

function AddTeamForm({ seasonId, onAdded }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: k === 'shortForm' ? e.target.value.toUpperCase() : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Team name is required');
    setBusy(true);
    try {
      await api.post('/teams', { ...form, seasonId });
      setForm(emptyForm);
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const disabled = !seasonId || busy;
  // Live preview uses the same logo/colour rules as the rest of the app.
  const preview = { shortForm: form.shortForm.trim(), primaryColour: form.primaryColour, secondaryColour: form.secondaryColour };

  return (
    <form className="app-card mb-4" onSubmit={submit}>
      <h3 className="app-card-title">Add team</h3>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="row g-2 align-items-end">
        <div className="col-12 col-md-5">
          <label htmlFor="team-name" className="form-label small">Name</label>
          <input id="team-name" className="form-control" placeholder="e.g. Boston" maxLength={45}
            value={form.name} onChange={set('name')} disabled={!seasonId} />
        </div>
        <div className="col-4 col-md-2">
          <label htmlFor="team-short" className="form-label small">Short form</label>
          <input id="team-short" className="form-control text-uppercase" placeholder="BOS" maxLength={5}
            value={form.shortForm} onChange={set('shortForm')} disabled={!seasonId} />
        </div>
        <div className="col-4 col-md-2">
          <label htmlFor="team-primary" className="form-label small">Primary</label>
          <input id="team-primary" type="color" className="form-control form-control-color w-100"
            value={form.primaryColour} onChange={set('primaryColour')} disabled={!seasonId} />
        </div>
        <div className="col-4 col-md-2">
          <label htmlFor="team-secondary" className="form-label small">Secondary</label>
          <input id="team-secondary" type="color" className="form-control form-control-color w-100"
            value={form.secondaryColour} onChange={set('secondaryColour')} disabled={!seasonId} />
        </div>
        <div className="col-12 col-md-1 d-flex justify-content-center pb-1" title="Logo preview">
          <TeamMark team={preview} size={34} />
        </div>
      </div>
      <p className="form-text mb-3">
        The logo is loaded from the short form, e.g. <code>BOS</code> → BOS.svg.
      </p>
      <button type="submit" className="btn btn-primary nav-btn" disabled={disabled}>Add Team</button>
    </form>
  );
}

const hex = (c) => (c ? `#${String(c).replace(/^#/, '').toUpperCase()}` : '');
const fromTeam = (t) => ({
  name: t.name ?? '',
  shortForm: t.shortForm ?? '',
  primaryColour: hex(t.primaryColour),
  secondaryColour: hex(t.secondaryColour),
});

// One team card: links to the roster; the pencil opens an inline editor for
// name, short form and colours. Enter saves, Escape cancels; only changed fields are sent.
function TeamTile({ team, index }) {
  const [saved, setSaved] = useState(() => fromTeam(team));
  const [draft, setDraft] = useState(null); // null when not editing
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const shown = draft ?? saved;
  const preview = { shortForm: shown.shortForm.trim(), primaryColour: shown.primaryColour, secondaryColour: shown.secondaryColour };
  const set = (k) => (e) => setDraft({ ...draft, [k]: k === 'shortForm' ? e.target.value.toUpperCase() : e.target.value });

  function cancel() {
    setDraft(null);
    setError('');
  }

  async function save(e) {
    e.preventDefault();
    const next = { ...draft, name: draft.name.trim(), shortForm: draft.shortForm.trim() };
    if (!next.name) return setError('Name cannot be blank');
    const changes = Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== saved[k]));
    if (!Object.keys(changes).length) return cancel();
    setSaving(true);
    setError('');
    try {
      await api.patch(`/teams/${team.id}`, changes);
      setSaved(next);
      // Keep the loaded list in sync for re-renders.
      Object.assign(team, {
        name: next.name,
        shortForm: next.shortForm || null,
        primaryColour: next.primaryColour.replace('#', '') || null,
        secondaryColour: next.secondaryColour.replace('#', '') || null,
      });
      setDraft(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const style = { '--team-color': teamAccent(preview.primaryColour, preview.secondaryColour, '#adb5bd') };

  if (draft) {
    return (
      <form className="team-tile team-tile-editing" style={style} onSubmit={save}
        onKeyDown={(e) => { if (e.key === 'Escape') cancel(); }}>
        <div className="d-flex align-items-center gap-2">
          <TeamMark team={preview} size={36} />
          <input className="form-control form-control-sm" aria-label="Team name" maxLength={45} autoFocus
            value={draft.name} onChange={set('name')} disabled={saving} />
        </div>
        <div className="d-flex align-items-end gap-2">
          <label className="flex-grow-1 small">
            Short form
            <input className="form-control form-control-sm text-uppercase" maxLength={5} placeholder="BOS"
              value={draft.shortForm} onChange={set('shortForm')} disabled={saving} />
          </label>
          <label className="small">
            Primary
            <input type="color" className="form-control form-control-sm form-control-color"
              value={draft.primaryColour || '#ADB5BD'} onChange={set('primaryColour')} disabled={saving} />
          </label>
          <label className="small">
            Secondary
            <input type="color" className="form-control form-control-sm form-control-color"
              value={draft.secondaryColour || '#FFFFFF'} onChange={set('secondaryColour')} disabled={saving} />
          </label>
        </div>
        {error && <span className="small text-danger">{error}</span>}
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={cancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="team-tile position-relative" style={style}>
      <TeamMark team={preview} size={44} />
      <div className="team-tile-body flex-grow-1">
        <Link to={`/teams/${team.id}`} className="team-tile-name stretched-link">{saved.name}</Link>
        <span className="team-tile-meta">#{index + 1}{saved.shortForm ? ` · ${saved.shortForm}` : ''}</span>
      </div>
      <button type="button" className="btn btn-sm btn-light team-tile-edit" title="Edit team"
        aria-label={`Edit ${saved.name}`} onClick={() => { setError(''); setDraft(saved); }}>
        <PencilIcon />
      </button>
    </div>
  );
}

export default function Teams() {
  const picker = useLeagueSeason();
  const { seasonId } = picker;
  const teams = useApi(seasonId ? `/teams?seasonId=${encodeURIComponent(seasonId)}` : null);

  return (
    <>
      <h2>Teams</h2>
      <LeagueSeasonPicker {...picker} autoSelectLatest />
      <AddTeamForm seasonId={seasonId} onAdded={teams.reload} />
      <ErrorAlert error={teams.error} />
      {seasonId && teams.data?.length === 0 && <p className="text-secondary">No teams in this season yet.</p>}
      {seasonId && (
        <div className="team-grid">
          {teams.data?.map((t, i) => <TeamTile key={t.id} team={t} index={i} />)}
        </div>
      )}
    </>
  );
}
