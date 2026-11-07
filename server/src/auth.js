import { Router } from 'express';
import crypto from 'node:crypto';

const passwords = (process.env.ADMIN_PASSWORDS || '')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function requireAuth(req, res, next) {
  if (req.session?.user === 'tmhlUser') return next();
  res.status(401).json({ error: 'Not logged in' });
}

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const pass = String(req.body?.password ?? '');
  if (pass && passwords.some((p) => safeEqual(p, pass))) {
    req.session.user = 'tmhlUser';
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid password' });
});

authRouter.post('/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

authRouter.get('/me', (req, res) => {
  res.json({ loggedIn: req.session?.user === 'tmhlUser' });
});
