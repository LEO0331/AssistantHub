import { ROLES } from './users.mjs';

function unauthorized(res) {
  res.set('WWW-Authenticate', 'Bearer');
  return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
}

export function createAuthMiddleware({ tokens, getUserModel }) {
  async function requireAuth(req, res, next) {
    const header = req.get('Authorization') || '';
    const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(header);
    if (!match || match[1].length > 8192) return unauthorized(res);
    let userId;
    try {
      userId = await tokens.verify(match[1]);
    } catch {
      return unauthorized(res);
    }
    let user;
    try {
      user = await getUserModel().findByPk(userId, {
        attributes: ['id', 'email', 'role', 'is_active']
      });
    } catch {
      return res.status(503).json({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Authentication service temporarily unavailable' }
      });
    }
    if (!user || !user.is_active || !ROLES.includes(user.role)) return unauthorized(res);
    req.authUser = { id: user.id, email: user.email, role: user.role };
    next();
  }

  function requireRole(...allowed) {
    if (!allowed.length || allowed.some(role => !ROLES.includes(role))) {
      throw new Error('Invalid RBAC policy');
    }
    return (req, res, next) => {
      if (!req.authUser) return unauthorized(res);
      if (!allowed.includes(req.authUser.role)) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      }
      next();
    };
  }
  return { requireAuth, requireRole };
}
