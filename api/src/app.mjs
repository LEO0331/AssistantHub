import express from 'express';

export function createApp({ db }) {
  if (!db || typeof db.authenticate !== 'function') {
    throw new TypeError('createApp requires a database connection with authenticate()');
  }
  const app = express();
  app.disable('x-powered-by');

  const disableCache = (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  };
  app.get('/api/health/live', disableCache, (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  app.get('/api/health/ready', disableCache, async (_req, res) => {
    try {
      await db.authenticate();
      res.status(200).json({ status: 'ok' });
    } catch {
      // Never return underlying DB hostnames, credentials, SQL, or stack traces.
      res.status(503).json({ status: 'unavailable' });
    }
  });

  // No candidate/application/auth routes until follow-up PRs. This backend is
  // not an unauthenticated public candidate search API.
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }));
  app.use((_err, _req, res, _next) => res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal error' } }));
  return app;
}
