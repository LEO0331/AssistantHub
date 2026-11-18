import { randomUUID } from 'node:crypto';

// Deliberately allowlist fields. Never include URL query, raw path IDs,
// Authorization, credentials, request bodies, reason text or Idempotency-Key.
export function createRequestObserver({ logger = event => console.info(JSON.stringify(event)),
  now = () => Date.now() } = {}) {
  return (req, res, next) => {
    const startedAt = now();
    const requestId = randomUUID();
    req.requestId = requestId; // ignore any caller-supplied X-Request-ID
    res.set('X-Request-ID', requestId);
    res.once('finish', () => {
      const event = {
        event: 'http_request_completed',
        level: res.statusCode >= 500 ? 'error' : 'info',
        requestId,
        method: req.method,
        route: typeof req.route?.path === 'string' ? req.route.path : 'unmatched',
        status: res.statusCode,
        durationMs: Math.max(0, now() - startedAt),
        role: req.authUser?.role || 'anonymous',
        outcome: res.locals.operationOutcome || 'normal'
      };
      // Logging is advisory; it must never change a completed HTTP response.
      try { logger(event); } catch { /* ignore sink failure */ }
    });
    next();
  };
}
