// Tiny in-memory rate limiter for face login (no new dependency).
// Keyed by IP + email; resets after the window.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const hits = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
}, 5 * 60 * 1000).unref();

const faceRateLimit = (req, res, next) => {
  const email = String(req.body?.email || '').toLowerCase();
  const key = `${req.ip}|${email}`;
  const now = Date.now();
  const entry = hits.get(key) && hits.get(key).resetAt > now ? hits.get(key) : { count: 0, resetAt: now + WINDOW_MS };
  entry.count += 1;
  hits.set(key, entry);
  if (entry.count > MAX_ATTEMPTS) {
    return res.status(429).json({ message: 'Too many face login attempts. Try again later or use your password.' });
  }
  next();
};

module.exports = { faceRateLimit };