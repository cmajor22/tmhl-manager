import { useParams } from 'react-router-dom';
import { useApi } from '../api.js';

// covidForm.php — printable contact tracing sheet for a game
function formatPhone(phone) {
  if (!phone) return '';
  const p = String(phone);
  return `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6, 10)}`;
}

const cell = { border: '1px solid black', padding: '2px 6px' };
const tall = { ...cell, height: 30, verticalAlign: 'top' };
const center = { ...cell, textAlign: 'center' };

export default function ContactForm() {
  const { gameId } = useParams();
  const { data, error } = useApi(`/games/${gameId}/contacts`);

  if (error) return <div className="alert alert-danger m-3">{error.message}</div>;
  if (!data) return null;

  const blankRows = Array.from({ length: 5 });

  return (
    <div className="print-page" style={{ width: 670, margin: 'auto', padding: '16px 0', fontFamily: 'serif', color: '#000' }}>
      <button type="button" className="btn btn-primary no-print mb-3" onClick={() => window.print()}>Print</button>
      <table>
        <tbody>
          <tr>
            <td><img src="/townLogo.jpg" alt="Town logo" /></td>
            <td style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'bottom', paddingLeft: 24 }}>
              Contact Tracing Information Collection
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ border: '1px solid black', marginTop: 5, borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: 4 }}>
              The Permit Holder and/or their Designate is responsible for screening and contact tracing for all
              individuals associated with their rental including all attendees, spectators, guardians etc. Contact
              information must be dated and securely retained for reference, for 30 days from each facility booking
              permit date. A copy of this information is to be submitted to the designated onsite Town of New
              Tecumseth staff upon entry to facility (15 minutes prior to booking time) where it will also be retained
              by the Town for 30 days from the date of the permitted rental.
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: '100%', border: '1px solid black', marginTop: 5, borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td colSpan={5} style={tall}>Rental Permit # or Organization: TMHL (FA-17953)</td>
            <td colSpan={3} style={tall}>Location: Tottenham</td>
          </tr>
          <tr>
            <td colSpan={4} style={tall}>Date: {data.date}</td>
            <td colSpan={4} style={tall}>Time: {data.time}</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...center, width: 200 }}>Name (Print):</td>
            <td colSpan={2} style={{ ...center, width: 150 }}>Phone Number:</td>
            <td colSpan={2} style={center}>In Attendance:</td>
            <td colSpan={2} style={center}>Health Screening Pass:</td>
          </tr>
          <tr>
            <td colSpan={2} style={cell} /><td colSpan={2} style={cell} />
            <td style={center}>Yes</td><td style={center}>No</td><td style={center}>Yes</td><td style={center}>No</td>
          </tr>
          {data.players.map((pl, i) => (
            <tr key={i}>
              <td colSpan={2} style={cell}>{pl.name}</td>
              <td colSpan={2} style={cell}>{formatPhone(pl.phone)}</td>
              <td style={cell} /><td style={cell} /><td style={cell} /><td style={cell} />
            </tr>
          ))}
          {blankRows.map((_, i) => (
            <tr key={`blank-${i}`}>
              <td colSpan={2} style={cell} /><td colSpan={2} style={cell} />
              <td style={cell}>&nbsp;</td><td style={cell} /><td style={cell} /><td style={cell} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
