import { Fragment, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../api.js';
import { ErrorAlert } from '../components/Layout.jsx';
import TeamMark from '../components/TeamMark.jsx';
import { inkOn, teamAccent } from '../teamStyle.js';

const PERIODS = ['1', '2', '3', 'OT'];

function periodLabel(p) {
  const s = String(p);
  if (s === '0' || s === 'OT') return 'OT';
  return { 1: '1st', 2: '2nd', 3: '3rd' }[s] ?? s;
}

function PlayerOptions({ roster }) {
  return roster.map((p) => (
    <option key={p.playerId} value={p.playerId}>
      {Number(p.isGoalie) === 1 ? 'G' : p.number} - {p.name}
    </option>
  ));
}

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

// Toggle-button style checkbox (Bootstrap btn-check).
function Toggle({ id, label, checked, onChange, tone = 'primary' }) {
  return (
    <>
      <input id={id} type="checkbox" className="btn-check" autoComplete="off" checked={checked} onChange={onChange} />
      <label htmlFor={id} className={`btn btn-sm btn-outline-${tone} rounded-pill`}>{label}</label>
    </>
  );
}

function PeriodPicker({ name, value, onChange }) {
  return (
    <div className="btn-group w-100" role="group" aria-label="Period">
      {PERIODS.map((x) => (
        <Fragment key={x}>
          <input type="radio" className="btn-check" name={name} id={`${name}-${x}`} value={x}
            checked={value === x} onChange={onChange} autoComplete="off" />
          <label className="btn btn-outline-secondary" htmlFor={`${name}-${x}`}>{x}</label>
        </Fragment>
      ))}
    </div>
  );
}

const emptyGoal = { goal: '', assist1: '', assist2: '', isSHG: false, isPP: false, isOT: false, period: '1', time: '' };
const emptyPenalty = { playerId: '', infraction: '', isGameMisconduct: false, minutes: '', period: '1', time: '' };

function TeamPanel({ gameId, team, roster, onChange, hidden }) {
  const { id: teamId, name: teamName } = team;
  const [goal, setGoal] = useState(emptyGoal);
  const [pen, setPen] = useState(emptyPenalty);
  const [error, setError] = useState('');

  const field = (state, setState) => (k) => (e) =>
    setState({ ...state, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const g = field(goal, setGoal);
  const p = field(pen, setPen);

  async function addGoal(e) {
    e.preventDefault();
    setError('');
    if (!goal.goal) return setError('Goal Scorer must be selected');
    if (!goal.time) return setError('You must specify a goal time');
    try {
      await api.post(`/games/${gameId}/goals`, { ...goal, teamId });
      setGoal({ ...emptyGoal, period: goal.period });
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addPenalty(e) {
    e.preventDefault();
    setError('');
    if (!pen.playerId) return setError('Player must be selected');
    if (!pen.infraction) return setError('You must specify an infraction');
    if (!pen.minutes) return setError('You must specify penalty minutes');
    if (!pen.time) return setError('You must specify a penalty time');
    try {
      await api.post(`/games/${gameId}/penalties`, { ...pen, teamId });
      setPen({ ...emptyPenalty, period: pen.period });
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  const id = (k) => `${teamId}-${k}`;

  // Kept mounted while hidden so half-entered goals/penalties survive switching teams.
  return (
    <div hidden={hidden}>
      {error && <div className="alert alert-danger">{error}</div>}
      {roster.length === 0 && <div className="alert alert-warning">No players on this team's roster.</div>}

      <div className="row g-3">
        <div className="col-lg-6">
          <form onSubmit={addGoal} className="app-card team-card h-100 d-flex flex-column" style={{ '--team-color': team.color }}>
            <h3 className="app-card-title d-flex align-items-center gap-2"><TeamMark team={team} size={22} /> {teamName} goal</h3>
            <label className="form-label small" htmlFor={id('goal')}>Scorer</label>
            <select id={id('goal')} className="form-select mb-2" value={goal.goal} onChange={g('goal')}>
              <option value="">Select player</option>
              <PlayerOptions roster={roster} />
            </select>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small" htmlFor={id('a1')}>Assist 1</label>
                <select id={id('a1')} className="form-select" value={goal.assist1} onChange={g('assist1')}>
                  <option value="">None</option>
                  <PlayerOptions roster={roster} />
                </select>
              </div>
              <div className="col-6">
                <label className="form-label small" htmlFor={id('a2')}>Assist 2</label>
                <select id={id('a2')} className="form-select" value={goal.assist2} onChange={g('assist2')}>
                  <option value="">None</option>
                  <PlayerOptions roster={roster} />
                </select>
              </div>
            </div>
            <div className="row g-2 mb-3">
              <div className="col-7">
                <span className="form-label small d-block">Period</span>
                <PeriodPicker name={id('goal-period')} value={goal.period} onChange={g('period')} />
              </div>
              <div className="col-5">
                <label className="form-label small" htmlFor={id('goal-time')}>Time</label>
                <input id={id('goal-time')} className="form-control" placeholder="mm:ss" value={goal.time} onChange={g('time')} />
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <Toggle id={id('isSHG')} label="Shorthanded" checked={goal.isSHG} onChange={g('isSHG')} />
              <Toggle id={id('isPP')} label="Powerplay" checked={goal.isPP} onChange={g('isPP')} />
              <Toggle id={id('isOT')} label="Overtime" checked={goal.isOT} onChange={g('isOT')} />
            </div>
            <button type="submit" className="btn btn-primary mt-auto">Add goal</button>
          </form>
        </div>

        <div className="col-lg-6">
          <form onSubmit={addPenalty} className="app-card team-card h-100 d-flex flex-column" style={{ '--team-color': team.color }}>
            <h3 className="app-card-title d-flex align-items-center gap-2"><TeamMark team={team} size={22} /> {teamName} penalty</h3>
            <label className="form-label small" htmlFor={id('pen-player')}>Player</label>
            <select id={id('pen-player')} className="form-select mb-2" value={pen.playerId} onChange={p('playerId')}>
              <option value="">Select player</option>
              <PlayerOptions roster={roster} />
            </select>
            <div className="row g-2 mb-3">
              <div className="col-8">
                <label className="form-label small" htmlFor={id('infraction')}>Infraction</label>
                <input id={id('infraction')} className="form-control" placeholder="e.g. Tripping" value={pen.infraction} onChange={p('infraction')} />
              </div>
              <div className="col-4">
                <label className="form-label small" htmlFor={id('minutes')}>Minutes</label>
                <input id={id('minutes')} className="form-control" placeholder="2" value={pen.minutes} onChange={p('minutes')} />
              </div>
            </div>
            <div className="row g-2 mb-3">
              <div className="col-7">
                <span className="form-label small d-block">Period</span>
                <PeriodPicker name={id('pen-period')} value={pen.period} onChange={p('period')} />
              </div>
              <div className="col-5">
                <label className="form-label small" htmlFor={id('pen-time')}>Time</label>
                <input id={id('pen-time')} className="form-control" placeholder="mm:ss" value={pen.time} onChange={p('time')} />
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <Toggle id={id('gm')} label="Game misconduct" tone="danger" checked={pen.isGameMisconduct} onChange={p('isGameMisconduct')} />
            </div>
            <button type="submit" className="btn btn-primary mt-auto">Add penalty</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EventCard({ title, count, empty, children }) {
  return (
    <section className="app-card p-0 mb-3">
      <div className="d-flex align-items-center gap-2 px-3 pt-3 pb-2">
        <h3 className="app-card-title mb-0">{title}</h3>
        <span className="badge rounded-pill text-bg-light border">{count}</span>
      </div>
      {count === 0
        ? <p className="text-secondary small px-3 pb-3 mb-0">{empty}</p>
        : <div className="table-responsive">{children}</div>}
    </section>
  );
}

export default function GameData() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { search } = useLocation();
  const game = useApi(`/games/${gameId}`);
  const goals = useApi(`/games/${gameId}/goals`);
  const penalties = useApi(`/games/${gameId}/penalties`);
  const [isOvertime, setIsOvertime] = useState(false);
  const [activeSide, setActiveSide] = useState('home');

  useEffect(() => {
    if (game.data) setIsOvertime(Number(game.data.isOvertime) === 1);
  }, [game.data]);

  const reloadEvents = () => {
    goals.reload();
    penalties.reload();
  };

  async function markUploaded() {
    await api.post(`/games/${gameId}/uploaded`, { isOvertime });
    navigate(`/game-data${search}`);
  }

  async function remove(url, what) {
    if (!window.confirm(`Delete this ${what}?`)) return;
    await api.del(url);
    reloadEvents();
  }

  const gd = game.data;
  const homeColor = gd && teamAccent(gd.homePrimaryColour, gd.homeSecondaryColour, '#0d6efd');
  const teams = gd && {
    home: { id: gd.homeId, name: gd.homeName, shortForm: gd.homeShortForm, color: homeColor },
    away: {
      id: gd.awayId,
      name: gd.awayName,
      shortForm: gd.awayShortForm,
      color: teamAccent(gd.awayPrimaryColour, gd.awaySecondaryColour, '#fd7e14', homeColor),
    },
  };
  const teamOf = (teamId) => (String(teamId) === String(gd.homeId) ? teams.home : teams.away);
  // Selected team button takes the team's colour.
  const teamButtonStyle = (t) => ({
    '--bs-btn-active-bg': t.color,
    '--bs-btn-active-border-color': t.color,
    '--bs-btn-active-color': inkOn(t.color),
    '--bs-btn-hover-bg': t.color,
    '--bs-btn-hover-border-color': t.color,
    '--bs-btn-hover-color': inkOn(t.color),
  });
  const score = (teamId) => (goals.data ?? []).filter((x) => String(x.teamId) === String(teamId)).length;
  const goalTags = (x) => [
    Number(x.isPP) === 1 && 'PP',
    Number(x.isSHG) === 1 && 'SH',
    Number(x.isOT) === 1 && 'OT',
  ].filter(Boolean);
  const deleteButton = (url, what) => (
    <button type="button" className="btn btn-sm btn-link text-danger p-1" title={`Delete ${what}`}
      aria-label={`Delete ${what}`} onClick={() => remove(url, what)}>
      <TrashIcon />
    </button>
  );

  return (
    <>
      <ErrorAlert error={game.error || goals.error || penalties.error} />
      {gd && (
        <>
          <Link to={`/game-data${search}`} className="back-link mb-3">← All games</Link>

          {/* Scoreboard + finalize */}
          <section className="app-card mb-4">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3 small text-secondary">
              <span>{gd.date} · {gd.time}</span>
              {Number(gd.isPlayoffs) === 1 && <span className="badge rounded-pill text-bg-warning">Playoffs</span>}
              {Number(gd.uploaded) === 1
                ? <span className="badge rounded-pill text-bg-success">Uploaded</span>
                : <span className="badge rounded-pill text-bg-secondary">Pending</span>}
            </div>
            <div className="scoreboard">
              <div className="scoreboard-team">
                <span className="scoreboard-side">Home</span>
                <span className="scoreboard-name"><TeamMark team={teams.home} size={40} /> {gd.homeName}</span>
              </div>
              <div className="scoreboard-score">
                {score(gd.homeId)}<span className="scoreboard-dash">–</span>{score(gd.awayId)}
                {isOvertime && <span className="scoreboard-ot">OT</span>}
              </div>
              <div className="scoreboard-team text-end">
                <span className="scoreboard-side">Away</span>
                <span className="scoreboard-name justify-content-end">{gd.awayName} <TeamMark team={teams.away} size={40} /></span>
              </div>
            </div>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pt-3 mt-3 border-top">
              <div className="form-check form-switch mb-0">
                <input id="gameOvertime" type="checkbox" role="switch" className="form-check-input" checked={isOvertime}
                  onChange={(e) => setIsOvertime(e.target.checked)} />
                <label htmlFor="gameOvertime" className="form-check-label">Game went to overtime</label>
              </div>
              <button type="button" className="btn btn-success px-4" onClick={markUploaded}>Mark as uploaded</button>
            </div>
          </section>

          {/* Entry */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <h2 className="h5 mb-0">Add events</h2>
            <div className="btn-group" role="group" aria-label="Team">
              {['home', 'away'].map((side) => (
                <Fragment key={side}>
                  <input type="radio" className="btn-check" name="entry-team" id={`entry-${side}`}
                    checked={activeSide === side} onChange={() => setActiveSide(side)} autoComplete="off" />
                  <label className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" htmlFor={`entry-${side}`}
                    style={teamButtonStyle(teams[side])}>
                    <TeamMark team={teams[side]} size={20} /> {teams[side].name}
                  </label>
                </Fragment>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <TeamPanel gameId={gameId} team={teams.home} roster={gd.homeRoster}
              onChange={reloadEvents} hidden={activeSide !== 'home'} />
            <TeamPanel gameId={gameId} team={teams.away} roster={gd.awayRoster}
              onChange={reloadEvents} hidden={activeSide !== 'away'} />
          </div>

          {/* Recorded events */}
          <EventCard title="Goals" count={goals.data?.length ?? 0} empty="No goals recorded yet.">
            <table className="table table-hover align-middle mb-0 event-table">
              <thead><tr><th>Per</th><th>Time</th><th>Team</th><th>Goal</th><th>Assists</th><th /></tr></thead>
              <tbody>
                {goals.data?.map((x) => (
                  <tr key={x.id}>
                    <td>{periodLabel(x.period)}</td>
                    <td>
                      {x.time}
                      {goalTags(x).map((t) => <span key={t} className="badge text-bg-light border ms-1">{t}</span>)}
                    </td>
                    <td className="text-nowrap"><span className="d-inline-flex align-items-center gap-2"><TeamMark team={teamOf(x.teamId)} /> {x.teamName}</span></td>
                    <td className="fw-semibold">{x.goalName}</td>
                    <td className="text-secondary">{[x.assist1Name, x.assist2Name].filter(Boolean).join(', ') || 'Unassisted'}</td>
                    <td className="text-end">{deleteButton(`/goals/${x.id}`, 'goal')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </EventCard>

          <EventCard title="Penalties" count={penalties.data?.length ?? 0} empty="No penalties recorded yet.">
            <table className="table table-hover align-middle mb-0 event-table">
              <thead><tr><th>Per</th><th>Time</th><th>Team</th><th>Player</th><th>Infraction</th><th /></tr></thead>
              <tbody>
                {penalties.data?.map((x) => (
                  <tr key={x.id}>
                    <td>{periodLabel(x.period)}</td>
                    <td>{x.time}</td>
                    <td className="text-nowrap"><span className="d-inline-flex align-items-center gap-2"><TeamMark team={teamOf(x.teamId)} /> {x.teamName}</span></td>
                    <td className="fw-semibold">{x.playerName}</td>
                    <td>
                      {x.infraction} <span className="text-secondary">({x.minutes} min)</span>
                      {Number(x.isGameMisconduct) === 1 && <span className="badge text-bg-danger ms-1">GM</span>}
                    </td>
                    <td className="text-end">{deleteButton(`/penalties/${x.id}`, 'penalty')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </EventCard>
        </>
      )}
    </>
  );
}
