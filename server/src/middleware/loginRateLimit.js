import { createHash } from 'node:crypto';

const MAX_FAILURES = 3;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_KEYS = 10_000;
const attempts = new Map();

function keyFor(req) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  // Hash the identifier so the in-memory limiter never retains an email address.
  return createHash('sha256').update(`${req.ip || req.socket?.remoteAddress || ''}\0${email}`).digest('hex');
}

function prune(now) {
  for (const [key, record] of attempts) {
    if (now - record.startedAt >= WINDOW_MS) attempts.delete(key);
  }
}

export function checkLoginAttempts(req, res, next) {
  const now = Date.now();
  prune(now);
  const key = keyFor(req);
  const record = attempts.get(key);
  if (record && record.failures >= MAX_FAILURES) {
    res.set('Retry-After', String(Math.max(1, Math.ceil((WINDOW_MS - (now - record.startedAt)) / 1000))));
    return res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' });
  }
  if (!record && attempts.size >= MAX_KEYS) {
    return res.status(429).json({ error: 'El acceso está temporalmente limitado. Intenta de nuevo más tarde.' });
  }
  req.loginAttemptKey = key;
  return next();
}

export function recordLoginFailure(key) {
  if (!key) return;
  const now = Date.now();
  prune(now);
  const record = attempts.get(key);
  if (record) record.failures += 1;
  else if (attempts.size < MAX_KEYS) attempts.set(key, { failures: 1, startedAt: now });
}

export function clearLoginFailures(key) {
  if (key) attempts.delete(key);
}

// Exported for a local, data-free security check.
export const loginAttemptPolicy = Object.freeze({ maxFailures: MAX_FAILURES, windowMs: WINDOW_MS });
