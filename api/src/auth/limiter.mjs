// Local-development / single-process limiter, NOT a distributed security control.
// A public multi-replica deployment must replace it with a shared rate limiter.
export function createLoginLimiter({ maxAttempts = 5, windowMs = 15 * 60 * 1000,
  now = () => Date.now(), maxKeys = 5000 } = {}) {
  const failures = new Map();
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || windowMs < 1 || maxKeys < 1) {
    throw new Error('Invalid rate-limit configuration');
  }
  function keyFor(req) {
    return String(req.ip || req.socket?.remoteAddress || 'unknown');
  }
  function current(key) {
    const entry = failures.get(key);
    if (entry && entry.expiresAt <= now()) {
      failures.delete(key);
      return null;
    }
    return entry || null;
  }
  return {
    check(req, res, next) {
      const key = keyFor(req);
      const entry = current(key);
      if (entry && entry.count >= maxAttempts) {
        res.set('Retry-After', String(Math.max(1, Math.ceil((entry.expiresAt - now()) / 1000))));
        return res.status(429).json({
          error: { code: 'LOGIN_RATE_LIMITED', message: 'Too many login attempts. Try again later.' }
        });
      }
      next();
    },
    failure(req) {
      const key = keyFor(req);
      const existing = current(key);
      // Bound the amount of memory used by untrusted IP keys.
      if (!existing && failures.size >= maxKeys) {
        for (const [stored, entry] of failures) {
          if (entry.expiresAt <= now()) failures.delete(stored);
        }
        if (failures.size >= maxKeys) failures.delete(failures.keys().next().value);
      }
      failures.set(key, { count: (existing?.count || 0) + 1, expiresAt: existing?.expiresAt || now() + windowMs });
    },
    success(req) { failures.delete(keyFor(req)); }
  };
}
