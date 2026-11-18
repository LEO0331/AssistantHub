import { Router } from 'express';
import { DUMMY_PASSWORD_HASH, verifyPassword } from '../auth/passwords.mjs';
import { normalizeEmail } from '../auth/users.mjs';

const failure = { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } };

export function createAuthRouter({ tokens, getUserModel, limiter, requireAuth }) {
  const router = Router();
  router.post('/login', limiter.check, async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        typeof body.email !== 'string' || typeof body.password !== 'string' ||
        body.password.length < 1 || body.password.length > 128 ||
        Buffer.byteLength(body.password, 'utf8') > 256) {
      return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Email and password are required' } });
    }
    let email;
    try { email = normalizeEmail(body.email); }
    catch { return res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Invalid login input' } }); }

    let user;
    try {
      user = await getUserModel().findOne({ where: { email } });
      const valid = await verifyPassword(body.password, user?.password_hash || DUMMY_PASSWORD_HASH);
      if (!user || !valid || !user.is_active) {
        limiter.failure(req);
        return res.status(401).json(failure);
      }
      const accessToken = await tokens.issue(user.id);
      limiter.success(req);
      res.set('Cache-Control', 'no-store');
      return res.status(200).json({
        accessToken,
        tokenType: 'Bearer',
        expiresIn: tokens.expiresIn,
        user: { id: user.id, email: user.email, role: user.role }
      });
    } catch {
      // Service errors must not reveal whether an account exists or disclose SQL.
      return res.status(503).json({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Authentication service temporarily unavailable' }
      });
    }
  });
  router.get('/me', requireAuth, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ user: req.authUser });
  });
  return router;
}
