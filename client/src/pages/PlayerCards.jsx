import { useParams } from 'react-router-dom';
import { useApi } from '../api.js';

// playerCards.php (19+) and playerCards40.php (40+) — printable draft cards, 3 per row
export default function PlayerCards() {
  const { division } = useParams();
  const { data, error } = useApi(`/public/player-cards/${division === '40' ? '40' : '19'}`);

  if (error) return <div className="alert alert-danger m-3">{error.message}</div>;
  if (!data) return null;
  if (data.length === 0) return <div className="m-3">0 results</div>;

  return (
    <div className="print-page container py-3">
      <button type="button" className="btn btn-primary no-print mb-3" onClick={() => window.print()}>Print</button>
      <div className="row row-cols-1 row-cols-sm-3 gy-5 text-center">
        {data.map((p) => (
          <div key={p.id} className="col">
            <div style={{ fontSize: 38 }}>{p.name}</div>
            <div style={{ fontSize: 26 }}>Position: {p.position} Rank: {p.rating}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
