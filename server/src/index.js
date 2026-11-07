import './env.js';
import express from 'express';
import cookieSession from 'cookie-session';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { authRouter } from './auth.js';
import { apiRouter, publicRouter } from './routes.js';

const isProd = process.env.NODE_ENV === 'production';
if (!process.env.SESSION_SECRET) {
  if (isProd) throw new Error('SESSION_SECRET must be set in production');
  console.warn('SESSION_SECRET not set; using an insecure dev secret');
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieSession({
  name: 'tmhl_session',
  secret: process.env.SESSION_SECRET || 'dev-only-secret',
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: 12 * 60 * 60 * 1000,
}));

app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api', apiRouter);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  // Hide internals in production; show the real cause while developing
  const message = status >= 500 && isProd ? 'Server error' : err.message;
  res.status(status).json({ error: message });
});

// In production, serve the built React app from ../client/dist
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`TMHL server listening on http://localhost:${port}`));
