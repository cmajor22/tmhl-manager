import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useApi } from '../api.js';
import { ErrorAlert } from '../components/Layout.jsx';

// editPlayer.php — change a player's jersey number on a team
export default function EditRosterPlayer() {
  const { rosterId } = useParams();
  const entry = useApi(`/roster/${rosterId}`);
  const [number, setNumber] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (entry.data) setNumber(entry.data.number ?? '');
  }, [entry.data]);

  async function save(e) {
    e.preventDefault();
    setStatus(null);
    try {
      await api.patch(`/roster/${rosterId}`, { number });
      setStatus({ ok: true, msg: 'Saved' });
    } catch (err) {
      setStatus({ ok: false, msg: err.message });
    }
  }

  return (
    <>
      <ErrorAlert error={entry.error} />
      {entry.data && (
        <form onSubmit={save}>
          <h2>{entry.data.name}</h2>
          {status && <div className={`alert ${status.ok ? 'alert-success' : 'alert-danger'}`}>{status.msg}</div>}
          <input className="form-control mb-2" placeholder="Player Number" value={number} onChange={(e) => setNumber(e.target.value)} required />
          <button type="submit" className="btn btn-primary nav-btn me-2">Update Player</button>
          <Link className="btn btn-outline-secondary" to={`/teams/${entry.data.teamId}`}>Back to team</Link>
        </form>
      )}
    </>
  );
}
