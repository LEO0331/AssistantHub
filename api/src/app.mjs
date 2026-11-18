import express from 'express';
import { createCandidateRouter } from './routes/candidates.mjs';

export function createApp({ db, corsOrigin = '' }) {
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

  // Synthetic candidate browsing is temporarily read-only and unauthenticated.
  // Do not add real candidate records or expose this backend publicly before PR #4.
  app.use('/api/candidates', createCandidateRouter({ db, corsOrigin }));

  // Auth, applications, and audit routes are deliberately not implemented yet.
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }));
  app.use((_err, _req, res, _next) => res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal error' } }));
  return app;
}
