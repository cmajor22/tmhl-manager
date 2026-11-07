# TMHL Manager (React + Express)

Port of the PHP admin app in the parent folder. It uses the same MySQL database and schema, with no migrations.

```
server/   Express JSON API (replaces php/*Gateway.php)
client/   React + Vite UI (replaces the *.php pages)
```

## Setup

```sh
npm run install:all
cp server/.env.example server/.env   # fill in DB creds, ADMIN_PASSWORDS, SESSION_SECRET
```

## Development

Run each in its own terminal:

```sh
npm run dev:server   # http://localhost:3001
npm run dev:client   # http://localhost:5173 (proxies /api to :3001)
```

## Production

```sh
npm run build        # builds client/dist
NODE_ENV=production npm start   # Express serves the API + built client on $PORT
```

## Page mapping

| PHP                        | React route                    | API                                   |
|----------------------------|--------------------------------|---------------------------------------|
| login.html                 | /login                         | POST /api/auth/login                  |
| index.php                  | /                              |                                       |
| leagues.php                | /leagues                       | GET/POST /api/leagues                 |
| seasons.php                | /seasons                       | GET/POST /api/seasons                 |
| teams.php                  | /teams                         | GET/POST /api/teams                   |
| manageTeam.php             | /teams/:teamId                 | GET/POST /api/teams/:id/roster        |
| editPlayer.php             | /roster/:rosterId/edit         | GET/PATCH /api/roster/:id             |
| players.php                | /players                       | GET/POST /api/players                 |
| games.php                  | /games                         | GET/POST /api/games                   |
| gameSelect.php             | /game-data                     | GET /api/games?order=upload           |
| gameData.php               | /game-data/:gameId             | /api/games/:id, goals, penalties      |
| covidForm.php              | /games/:gameId/contact-form    | GET /api/games/:id/contacts           |
| playerCards.php / 40.php   | /player-cards/19, /40 (public) | GET /api/public/player-cards/:div     |

Not ported: `emailGen.php` (disabled with `die;` and used for one-off campaigns) and `new/` (an unfinished public-site redesign).
