import express from 'express';
import { createRequestObserver } from './observability/requestObserver.mjs';
import { createCandidateRouter } from './routes/candidates.mjs';
import { createApplicationRouter } from './routes/applications.mjs';
import { createAuthRouter } from './routes/auth.mjs';
import { createAuthMiddleware } from './auth/middleware.mjs';
import { createTokenService } from './auth/tokens.mjs';
import { createLoginLimiter } from './auth/limiter.mjs';
import { defineModels } from './db/models.mjs';

export function createApp({ db, corsOrigin = '', jwtSecret, loginLimiter, requestLogger }) {
  if (!db || typeof db.authenticate !== 'function') {
    throw new TypeError('createApp requires a database connection with authenticate()');
  }
  const app = express();
  app.disable('x-powered-by');
  app.use(createRequestObserver({ logger: requestLogger || (event => {
    if (process.env.NODE_ENV !== 'test') console.info(JSON.stringify(event));
  }) }));
  const tokens = createTokenService(jwtSecret);
  let models;
  const getModels = () => { models ||= defineModels(db); return models; };
  const getUserModel = () => getModels().User;
  const auth = createAuthMiddleware({ tokens, getUserModel });
  const limiter = loginLimiter || createLoginLimiter();

  app.use(express.json({ limit: '4kb', strict: true }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.vary('Origin');
    const origin = req.get('Origin');
    if (corsOrigin && origin === corsOrigin) {
      res.set('Access-Control-Allow-Origin', corsOrigin);
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, Idempotency-Key');
      res.set('Access-Control-Expose-Headers', 'X-Request-ID, Idempotency-Replayed');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(corsOrigin && origin === corsOrigin ? 204 : 403);
    next();
  });

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

  app.use('/api/auth', createAuthRouter({
    tokens, getUserModel, limiter, requireAuth: auth.requireAuth
  }));
  app.get('/api/admin/users/summary', auth.requireAuth, auth.requireRole('admin'), async (_req, res) => {
    try {
      const User = getUserModel();
      const [total, active, viewer, recruiter, admin] = await Promise.all([
        User.count(), User.count({ where: { is_active: true } }),
        User.count({ where: { role: 'viewer' } }),
        User.count({ where: { role: 'recruiter' } }),
        User.count({ where: { role: 'admin' } })
      ]);
      return res.status(200).json({ total, active, byRole: { viewer, recruiter, admin } });
    } catch {
      return res.status(503).json({ error: {
        code: 'SERVICE_UNAVAILABLE', message: 'Admin service temporarily unavailable'
      } });
    }
  });

  app.use('/api/candidates', auth.requireAuth,
    auth.requireRole('viewer', 'recruiter', 'admin'),
    createCandidateRouter({ db }));

  // All workflow reads require a current, active DB-backed JWT session.
  // Only Recruiter/Admin may transition; authorization happens before handlers.
  app.use('/api/applications', auth.requireAuth,
    auth.requireRole('viewer', 'recruiter', 'admin'),
    createApplicationRouter({ db, requireRole: auth.requireRole }));

  // Hiring workflow mutations are authenticated, idempotent and audited;
  // the public GitHub Pages demo stays in offline mode by default.
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }));
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal error' } });
  });
  return app;
}
