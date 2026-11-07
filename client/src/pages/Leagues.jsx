import { api, useApi } from '../api.js';
import AddByName from '../components/AddByName.jsx';
import { ErrorAlert } from '../components/Layout.jsx';

export default function Leagues() {
  const leagues = useApi('/leagues');

  async function addLeague(name) {
    await api.post('/leagues', { name });
    leagues.reload();
  }

  return (
    <>
      <h2>Leagues</h2>
      <AddByName placeholder="League Name" buttonLabel="Add League" onAdd={addLeague} />
      <ErrorAlert error={leagues.error} />
      <table className="table table-striped bg-white">
        <thead><tr><th>ID</th><th>Name</th></tr></thead>
        <tbody>
          {leagues.data?.map((l) => (
            <tr key={l.id}><td>{l.id}</td><td>{l.name}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
