// JSON API replacing php/*Gateway.php. SQL is ported as-is from the PHP so
// reads/writes against the existing schema are unchanged; columns are aliased
// so the JSON keys are consistent regardless of the schema's mixed casing.
import { Router } from 'express';
import { query, pool } from './db.js';
import { requireAuth } from './auth.js';
import { sendGameMisconductNotice } from './mailer.js';

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const flag = (v) => (v === true || v === 1 || v === '1' ? 1 : 0);

function required(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  if (missing.length) {
    const err = new Error(`Missing required field(s): ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Public (PHP versions had their login check commented out)
// ---------------------------------------------------------------------------
export const publicRouter = Router();

// playerCards.php (19+) / playerCards40.php (40+)
publicRouter.get('/player-cards/:division', wrap(async (req, res) => {
  const is40 = req.params.division === '40';
  const rows = is40
    ? await query('select playersId as id, name, position, latestRating40 as rating from players where isActive40=1 order by name')
    : await query('select playersId as id, name, position, latestRating19 as rating from players where isActive=1 order by latestrating19, name');
  res.json(rows);
}));

// ---------------------------------------------------------------------------
// Admin (login required)
// ---------------------------------------------------------------------------
export const apiRouter = Router();
apiRouter.use(requireAuth);

// --- Leagues (leaguesGateway.php) ---
apiRouter.get('/leagues', wrap(async (req, res) => {
  res.json(await query('select leaguesid as id, name from leagues'));
}));

apiRouter.post('/leagues', wrap(async (req, res) => {
  required(req.body, ['name']);
  const r = await query('insert into leagues (name) values (?)', [req.body.name]);
  res.status(201).json({ id: r.insertId });
}));

// --- Seasons (seasonsGateway.php, teams/games "getSeasonList") ---
apiRouter.get('/seasons', wrap(async (req, res) => {
  if (req.query.leagueId) {
    return res.json(await query(
      'select seasonsid as id, leaguesid as leagueId, name from seasons where leaguesid=?',
      [req.query.leagueId],
    ));
  }
  res.json(await query(
    'select seasons.seasonsid as id, seasons.leaguesid as leagueId, leagues.name as leagueName, seasons.name from leagues, seasons where seasons.leaguesid=leagues.leaguesid',
  ));
}));

apiRouter.post('/seasons', wrap(async (req, res) => {
  required(req.body, ['leagueId', 'name']);
  const r = await query('insert into seasons (leaguesid, isActive, name) values (?, 1, ?)', [req.body.leagueId, req.body.name]);
  res.status(201).json({ id: r.insertId });
}));

// --- Teams (teamsGateway.php) ---
apiRouter.get('/teams', wrap(async (req, res) => {
  required(req.query, ['seasonId']);
  res.json(await query('select teamsId as id, name, shortForm, primaryColour, secondaryColour from teams where seasonsId=? order by teamsId', [req.query.seasonId]));
}));

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

// Optional team fields. Colours are stored as 6-digit hex without '#', like the existing rows.
function teamShortForm(v) {
  const s = String(v ?? '').trim().toUpperCase();
  if (!s) return null;
  if (!/^[A-Z0-9]{1,5}$/.test(s)) throw badRequest('Short form must be 1-5 letters or numbers');
  return s;
}

function teamColour(v, label) {
  const s = String(v ?? '').trim().replace(/^#/, '').toUpperCase();
  if (!s) return null;
  if (!/^[0-9A-F]{6}$/.test(s)) throw badRequest(`${label} must be a 6-digit hex colour`);
  return s;
}

function teamName(v) {
  const s = String(v ?? '').trim();
  if (!s) throw badRequest('Team name cannot be blank');
  if (s.length > 45) throw badRequest('Team name must be 45 characters or fewer');
  return s;
}

apiRouter.post('/teams', wrap(async (req, res) => {
  required(req.body, ['name', 'seasonId']);
  const b = req.body;
  const r = await query(
    'insert into teams (name, seasonsId, isActive, shortForm, primaryColour, secondaryColour) values (?, ?, 1, ?, ?, ?)',
    [teamName(b.name), b.seasonId, teamShortForm(b.shortForm),
      teamColour(b.primaryColour, 'Primary colour'), teamColour(b.secondaryColour, 'Secondary colour')],
  );
  res.status(201).json({ id: r.insertId });
}));

// Inline edit from the Teams page: any of name, shortForm, primaryColour, secondaryColour.
// Blank shortForm/colours clear them; name can't be blank.
apiRouter.patch('/teams/:teamId', wrap(async (req, res) => {
  const b = req.body;
  const sets = [];
  const params = [];
  const add = (col, value) => { sets.push(`${col}=?`); params.push(value); };
  if ('name' in b) add('name', teamName(b.name));
  if ('shortForm' in b) add('shortForm', teamShortForm(b.shortForm));
  if ('primaryColour' in b) add('primaryColour', teamColour(b.primaryColour, 'Primary colour'));
  if ('secondaryColour' in b) add('secondaryColour', teamColour(b.secondaryColour, 'Secondary colour'));
  if (!sets.length) throw badRequest('Nothing to update: send name, shortForm, primaryColour or secondaryColour');
  const r = await query(`update teams set ${sets.join(', ')} where teamsId=?`, [...params, req.params.teamId]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Team not found' });
  res.json({ ok: true });
}));

apiRouter.get('/teams/:teamId', wrap(async (req, res) => {
  const [team] = await query('select teamsId as id, name, shortForm, primaryColour, secondaryColour, seasonsId as seasonId from teams where teamsId=?', [req.params.teamId]);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json(team);
}));

// --- Team roster (manageTeamGateway.php) ---
apiRouter.get('/teams/:teamId/roster', wrap(async (req, res) => {
  res.json(await query(
    `select playersforteams.playersforteamsId as id, players.playersId as playerId, players.name,
            playersforteams.playerNumber as number, isCaptain, isGoalie
       from playersforteams, players
      where playersforteams.playersId=players.playersId and teamsId=?
      order by isCaptain desc, isGoalie desc, name`,
    [req.params.teamId],
  ));
}));

apiRouter.post('/teams/:teamId/roster', wrap(async (req, res) => {
  required(req.body, ['playerId', 'number']);
  const { playerId, number, isGoalie, isCaptain } = req.body;
  const r = await query(
    'insert into playersforteams (teamsId, playersId, playerNumber, isGoalie, isCaptain) values (?, ?, ?, ?, ?)',
    [req.params.teamId, playerId, number, flag(isGoalie), flag(isCaptain)],
  );
  res.status(201).json({ id: r.insertId });
}));

// editPlayer.php -> playersGateway.php updatePlayer
// Partial update: any of number, isCaptain, isGoalie may be sent.
apiRouter.patch('/roster/:id', wrap(async (req, res) => {
  const sets = [];
  const params = [];
  if ('number' in req.body) {
    required(req.body, ['number']);
    sets.push('playerNumber=?');
    params.push(req.body.number);
  }
  if ('isCaptain' in req.body) {
    sets.push('isCaptain=?');
    params.push(flag(req.body.isCaptain));
  }
  if ('isGoalie' in req.body) {
    sets.push('isGoalie=?');
    params.push(flag(req.body.isGoalie));
  }
  if (!sets.length) {
    const err = new Error('Nothing to update: send number, isCaptain or isGoalie');
    err.status = 400;
    throw err;
  }
  await query(`update playersforteams set ${sets.join(', ')} where playersforteamsId=?`, [...params, req.params.id]);
  res.json({ ok: true });
}));

apiRouter.get('/roster/:id', wrap(async (req, res) => {
  const [row] = await query(
    `select playersforteams.playersforteamsId as id, playersforteams.teamsId as teamId, players.playersId as playerId,
            players.name, playersforteams.playerNumber as number
       from playersforteams, players
      where playersforteams.playersId=players.playersId and playersforteamsId=?`,
    [req.params.id],
  );
  if (!row) return res.status(404).json({ error: 'Roster entry not found' });
  res.json(row);
}));

// --- Players (playersGateway.php) ---
apiRouter.get('/players', wrap(async (req, res) => {
  const order = req.query.sort === 'name' ? 'name' : 'playersId desc';
  res.json(await query(
    `select playersId as id, name, isActive, latestRating19, isActive40, latestRating40, position
       from players order by ${order}`,
  ));
}));

// Partial update from the players grid. Ratings/position are free text; blank clears them.
const playerTextFields = ['latestRating19', 'latestRating40', 'position'];
const playerFlagFields = ['isActive', 'isActive40'];
apiRouter.patch('/players/:id', wrap(async (req, res) => {
  const b = req.body;
  const sets = [];
  const params = [];
  if ('name' in b) {
    required(b, ['name']);
    sets.push('name=?');
    params.push(String(b.name).trim());
  }
  for (const f of playerTextFields) {
    if (f in b) {
      const v = b[f] == null ? '' : String(b[f]).trim();
      sets.push(`${f}=?`);
      params.push(v === '' ? null : v);
    }
  }
  for (const f of playerFlagFields) {
    if (f in b) {
      sets.push(`${f}=?`);
      params.push(flag(b[f]));
    }
  }
  if (!sets.length) {
    return res.status(400).json({ error: `Nothing to update: send name, ${[...playerFlagFields, ...playerTextFields].join(', ')}` });
  }
  await query(`update players set ${sets.join(', ')} where playersId=?`, [...params, req.params.id]);
  res.json({ ok: true });
}));

apiRouter.post('/players', wrap(async (req, res) => {
  required(req.body, ['name']);
  const r = await query('insert into players (name) values (?)', [req.body.name]);
  res.status(201).json({ id: r.insertId });
}));

// --- Games (gamesGateway.php / gameSelectGateway.php) ---
apiRouter.get('/games', wrap(async (req, res) => {
  required(req.query, ['seasonId']);
  // gameSelect listed un-uploaded games first; the games page listed newest first
  const order = req.query.order === 'upload' ? 'uploaded, date, time_to_sec(time)' : 'date desc, time_to_sec(time)';
  res.json(await query(
    `select games.gamesId as id, date, time, uploaded,
            homeId, home.name as homeName, home.shortForm as homeShortForm,
            home.primaryColour as homePrimaryColour, home.secondaryColour as homeSecondaryColour,
            awayId, away.name as awayName, away.shortForm as awayShortForm,
            away.primaryColour as awayPrimaryColour, away.secondaryColour as awaySecondaryColour
       from games, teamsforgames, teams home, teams away
      where games.gamesId=teamsforgames.gamesid and games.seasonsId=?
        and home.teamsId=homeId and away.teamsId=awayId
      order by ${order}`,
    [req.query.seasonId],
  ));
}));

apiRouter.post('/games', wrap(async (req, res) => {
  required(req.body, ['date', 'time', 'seasonId', 'homeId', 'awayId']);
  const { date, time, seasonId, isPlayoffs, homeId, awayId } = req.body;
  if (String(homeId) === String(awayId)) return res.status(400).json({ error: 'Teams must be different' });

  // PHP did these two inserts without a transaction; wrapping them avoids orphaned games.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [g] = await conn.query(
      'insert into games (date, time, seasonsId, uploaded, isPlayoffs, isOvertime) values (?, ?, ?, 0, ?, 0)',
      [date, time, seasonId, flag(isPlayoffs)],
    );
    await conn.query('insert into teamsforgames (gamesId, homeId, awayId) values (?, ?, ?)', [g.insertId, homeId, awayId]);
    await conn.commit();
    res.status(201).json({ id: g.insertId });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

// Partial update from the games grid: any of date, time, homeId, awayId.
apiRouter.patch('/games/:id', wrap(async (req, res) => {
  const b = req.body;
  const gameSets = [];
  const gameParams = [];
  for (const f of ['date', 'time']) {
    if (f in b) {
      required(b, [f]);
      gameSets.push(`${f}=?`);
      gameParams.push(b[f]);
    }
  }
  const teamSets = [];
  const teamParams = [];
  for (const f of ['homeId', 'awayId']) {
    if (f in b) {
      required(b, [f]);
      teamSets.push(`${f}=?`);
      teamParams.push(b[f]);
    }
  }
  if (!gameSets.length && !teamSets.length) {
    return res.status(400).json({ error: 'Nothing to update: send date, time, homeId or awayId' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (teamSets.length) {
      const [[cur]] = await conn.query('select homeId, awayId from teamsforgames where gamesId=? for update', [req.params.id]);
      if (!cur) {
        await conn.rollback();
        return res.status(404).json({ error: 'Game not found' });
      }
      const homeId = b.homeId ?? cur.homeId;
      const awayId = b.awayId ?? cur.awayId;
      if (String(homeId) === String(awayId)) {
        await conn.rollback();
        return res.status(400).json({ error: 'Teams must be different' });
      }
      await conn.query(`update teamsforgames set ${teamSets.join(', ')} where gamesId=?`, [...teamParams, req.params.id]);
    }
    if (gameSets.length) {
      await conn.query(`update games set ${gameSets.join(', ')} where gamesId=?`, [...gameParams, req.params.id]);
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

async function gameRoster(gamesId, side) {
  const col = side === 'home' ? 'homeId' : 'awayId';
  return query(
    `select players.playersId as playerId, players.name, playerNumber as number, isGoalie
       from players, playersforteams, teamsforgames
      where players.playersId=playersforteams.playersId
        and playersforteams.teamsId=teamsforgames.${col}
        and teamsforgames.gamesId=?
      order by isGoalie desc, playerNumber`,
    [gamesId],
  );
}

// gameData.php header + gameDataGateway.php getHomeData/getAwayData
apiRouter.get('/games/:id', wrap(async (req, res) => {
  const [game] = await query(
    `select games.gamesId as id, date, time, uploaded, isPlayoffs, isOvertime, games.seasonsId as seasonId,
            home.teamsId as homeId, home.name as homeName, home.shortForm as homeShortForm,
            home.primaryColour as homePrimaryColour, home.secondaryColour as homeSecondaryColour,
            away.teamsId as awayId, away.name as awayName, away.shortForm as awayShortForm,
            away.primaryColour as awayPrimaryColour, away.secondaryColour as awaySecondaryColour
       from games, teamsforgames, teams home, teams away
      where games.gamesId=teamsforgames.gamesId and home.teamsId=homeId and away.teamsId=awayId
        and games.gamesId=?`,
    [req.params.id],
  );
  if (!game) return res.status(404).json({ error: 'Game not found' });
  const [homeRoster, awayRoster] = await Promise.all([gameRoster(game.id, 'home'), gameRoster(game.id, 'away')]);
  res.json({ ...game, homeRoster, awayRoster });
}));

apiRouter.post('/games/:id/uploaded', wrap(async (req, res) => {
  await query('update games set uploaded=1, isOvertime=? where gamesId=?', [flag(req.body.isOvertime), req.params.id]);
  res.json({ ok: true });
}));

// covidForm.php
apiRouter.get('/games/:id/contacts', wrap(async (req, res) => {
  const rows = await query(
    `select players.name, players.phone, games.date, games.time
       from games, teamsforgames, playersforteams, players
      where games.gamesId=? and games.gamesid=teamsforgames.gamesId
        and (playersforteams.teamsId=teamsforgames.homeId or playersforteams.teamsId=teamsforgames.awayId)
        and playersforteams.playersId=players.playersId
      order by name`,
    [req.params.id],
  );
  res.json({
    date: rows[0]?.date ?? null,
    time: rows[0]?.time ?? null,
    players: rows.map(({ name, phone }) => ({ name, phone })),
  });
}));

// --- Goals ---
apiRouter.get('/games/:id/goals', wrap(async (req, res) => {
  const sub = 'select players.playersId, players.name, playerNumber, teamsId from players, playersforteams where players.playersId=playersforteams.playersId';
  res.json(await query(
    `select goals.goalsId as id, goals.teamsId as teamId, goals.period, goals.time, goals.isSHG, goals.isPP, goals.isOT,
            teams.name as teamName,
            concat(goal.name, ' (', goal.playerNumber, ')') as goalName,
            concat(assist1.name, ' (', assist1.playerNumber, ')') as assist1Name,
            concat(assist2.name, ' (', assist2.playerNumber, ')') as assist2Name
       from teams, goals
       left join (${sub}) goal on goal.playersId=goals.goal and goal.teamsId=goals.teamsId
       left join (${sub}) assist1 on assist1.playersId=goals.assist1 and assist1.teamsId=goals.teamsId
       left join (${sub}) assist2 on assist2.playersId=goals.assist2 and assist2.teamsId=goals.teamsId
      where goals.teamsId=teams.teamsId and gamesId=?`,
    [req.params.id],
  ));
}));

apiRouter.post('/games/:id/goals', wrap(async (req, res) => {
  required(req.body, ['teamId', 'goal', 'period', 'time']);
  const b = req.body;
  // Assists: '' means "none", exactly what the PHP form sent, so stored values don't change.
  const r = await query(
    'insert into goals (gamesId, teamsId, goal, assist1, assist2, isSHG, isPP, isOT, period, time) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.params.id, b.teamId, b.goal, b.assist1 ?? '', b.assist2 ?? '', flag(b.isSHG), flag(b.isPP), flag(b.isOT), b.period, b.time],
  );
  res.status(201).json({ id: r.insertId });
}));

apiRouter.delete('/goals/:id', wrap(async (req, res) => {
  await query('delete from goals where goalsId=?', [req.params.id]);
  res.json({ ok: true });
}));

// --- Penalties ---
apiRouter.get('/games/:id/penalties', wrap(async (req, res) => {
  res.json(await query(
    `select penalties.penaltiesId as id, penalties.teamsId as teamId, penalties.period, penalties.time,
            penalties.infraction, penalties.minutes, penalties.isGameMisconduct,
            teams.name as teamName, concat(players.name, ' (', playerNumber, ')') as playerName
       from penalties, teams, players, playersforteams
      where penalties.teamsId=teams.teamsId and penalties.playersId=players.playersId
        and playersforteams.teamsId=penalties.teamsId and playersforteams.playersId=players.playersId
        and gamesId=?`,
    [req.params.id],
  ));
}));

apiRouter.post('/games/:id/penalties', wrap(async (req, res) => {
  required(req.body, ['teamId', 'playerId', 'infraction', 'minutes', 'period', 'time']);
  const b = req.body;
  const misconduct = flag(b.isGameMisconduct);
  const r = await query(
    'insert into penalties (gamesId, teamsId, playersId, infraction, minutes, period, time, isGameMisconduct) values (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.params.id, b.teamId, b.playerId, b.infraction, b.minutes, b.period, b.time, misconduct],
  );
  if (misconduct) {
    sendGameMisconductNotice(req.params.id).catch((e) => console.error('[mailer] failed:', e.message));
  }
  res.status(201).json({ id: r.insertId });
}));

apiRouter.delete('/penalties/:id', wrap(async (req, res) => {
  await query('delete from penalties where penaltiesId=?', [req.params.id]);
  res.json({ ok: true });
}));
