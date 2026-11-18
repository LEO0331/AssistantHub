import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { createApp } from '../src/app.mjs';
import { databaseConfig, serverConfig } from '../src/config.mjs';
import { createSequelize } from '../src/db/connection.mjs';
import { defineModels } from '../src/db/models.mjs';
import { hashPassword, verifyPassword } from '../src/auth/passwords.mjs';
import { provisionUser } from '../src/auth/users.mjs';
import { createLoginLimiter } from '../src/auth/limiter.mjs';
import { createTokenService } from '../src/auth/tokens.mjs';

const SECRET = 'ci_only_jwt_signing_secret_do_not_use_outside_tests_12345';
const PASSWORD = 'Real-Mock-Only-Strong-Password-5678!';
async function start(t, limiter) {
  assert.equal(process.env.NODE_ENV, 'test', 'Integration tests require a disposable database');
  const db = createSequelize(databaseConfig());
  t.after(() => db.close());
  await db.authenticate();
  const { User } = defineModels(db);
  const server = createApp({
    db,
    corsOrigin: 'http://127.0.0.1:3000',
    jwtSecret: SECRET,
    loginLimiter: limiter
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const url = 'http://127.0.0.1:' + server.address().port;
  return {
    User,
    url,
    request: async (path, { token, body, method = 'GET', headers = {} } = {}) => {
      const response = await fetch(url + path, {
        method, headers: {
          ...headers,
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
      });
      return { status: response.status, json: await response.json(), headers: response.headers };
    },
    addUser: role => provisionUser({
      User,
      role,
      email: role + '-' + randomUUID() + '@test.example',
      password: PASSWORD
    })
  };
}

test('scrypt uses unique salts, verifies securely, and rejects weak input', async () => {
  const a = await hashPassword(PASSWORD);
  const b = await hashPassword(PASSWORD);
  assert.notEqual(a, b);
  assert.ok(a.startsWith('scrypt$16384$8$1$'));
  assert.equal(await verifyPassword(PASSWORD, a), true);
  assert.equal(await verifyPassword('not-the-password', a), false);
  assert.equal(await verifyPassword(PASSWORD, 'invalid-hash'), false);
  await assert.rejects(hashPassword('short'), /12/);
  assert.throws(() => serverConfig({ AUTH_JWT_SECRET: 'short' }), /AUTH_JWT_SECRET/);
});

test('viewer login authenticates valid credentials; no account enumeration or token leakage', async t => {
  const { addUser, request } = await start(t);
  const user = await addUser('viewer');
  const correct = await request('/api/auth/login', { method: 'POST', body: {
    email: user.email.toUpperCase(), password: PASSWORD
  } });
  assert.equal(correct.status, 200);
  assert.equal(correct.json.user.role, 'viewer');
  assert.equal(correct.json.tokenType, 'Bearer');
  assert.equal(correct.json.expiresIn, 900);
  assert.equal(correct.json.accessToken.split('.').length, 3);
  assert.equal(correct.headers.get('cache-control'), 'no-store');
  assert.equal(correct.json.user.password_hash, undefined);

  const who = await request('/api/auth/me', { token: correct.json.accessToken });
  assert.equal(who.status, 200);
  assert.equal(who.json.user.id, user.id);

  const wrong = await request('/api/auth/login', { method: 'POST', body: {
    email: user.email, password: 'wrong!'
  } });
  const missing = await request('/api/auth/login', { method: 'POST', body: {
    email: 'nonexistent-' + randomUUID() + '@test.example', password: 'wrong!'
  } });
  assert.equal(wrong.status, 401);
  assert.equal(missing.status, 401);
  assert.deepEqual(wrong.json, missing.json);
  assert.doesNotMatch(JSON.stringify(wrong.json), /password_hash|SQL|stack|secret/i);
});

test('RBAC restricts admin-only operations and checks current DB role each request', async t => {
  const { addUser, request, User } = await start(t);
  const viewer = await addUser('viewer');
  const recruiter = await addUser('recruiter');
  const admin = await addUser('admin');
  const tokenFor = async user => (await request('/api/auth/login', {
    method: 'POST', body: { email: user.email, password: PASSWORD }
  })).json.accessToken;
  const [v, r, a] = await Promise.all([tokenFor(viewer), tokenFor(recruiter), tokenFor(admin)]);
  const noToken = await request('/api/candidates');
  assert.equal(noToken.status, 401);
  const read = await request('/api/candidates?pageSize=1', { token: v });
  assert.equal(read.status, 200);
  assert.equal(read.json.items.length, 1);
  assert.equal((await request('/api/admin/users/summary', { token: v })).status, 403);
  assert.equal((await request('/api/admin/users/summary', { token: r })).status, 403);
  const adminSummary = await request('/api/admin/users/summary', { token: a });
  assert.equal(adminSummary.status, 200);
  assert.ok(adminSummary.json.total >= 3);
  assert.deepEqual(Object.keys(adminSummary.json.byRole).sort(), ['admin', 'recruiter', 'viewer']);
  assert.equal((await request('/api/admin/users/summary')).status, 401);
  // A token cannot preserve stale privileges after server-side demotion.
  await User.update({ role: 'viewer' }, { where: { id: admin.id } });
  assert.equal((await request('/api/admin/users/summary', { token: a })).status, 403);
  await User.update({ is_active: false }, { where: { id: viewer.id } });
  assert.equal((await request('/api/candidates', { token: v })).status, 401);
});

test('JWT tampering, expiry, wrong issuer/audience, wrong signature and malformed auth are denied', async t => {
  const { addUser, request } = await start(t);
  const user = await addUser('viewer');
  const tokens = createTokenService(SECRET);
  const valid = await tokens.issue(user.id);
  const other = await createTokenService('another_valid_but_different_test_signing_secret_123').issue(user.id);
  const now = Math.floor(Date.now() / 1000);
  const expired = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id).setIssuer('assistanthub-api').setAudience('assistanthub-browser')
    .setIssuedAt(now - 3600).setExpirationTime(now - 600)
    .sign(new TextEncoder().encode(SECRET));
  const wrongAudience = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id).setIssuer('assistanthub-api').setAudience('other-service')
    .setIssuedAt().setExpirationTime('10m')
    .sign(new TextEncoder().encode(SECRET));
  for (const token of ['invalid', other, expired, wrongAudience, valid.slice(0, -4) + 'abcd']) {
    assert.equal((await request('/api/candidates', { token })).status, 401);
  }
  const malformed = await request('/api/auth/me', { headers: { Authorization: 'Basic anything' } });
  assert.equal(malformed.status, 401);
  assert.equal(malformed.json.error.code, 'UNAUTHORIZED');
});

test('per-IP login failures throttle, but limiter is explicitly process-local', async t => {
  const limiter = createLoginLimiter({ maxAttempts: 2, windowMs: 60000 });
  const { addUser, request } = await start(t, limiter);
  const user = await addUser('viewer');
  const bad = { email: user.email, password: 'incorrect' };
  assert.equal((await request('/api/auth/login', { method: 'POST', body: bad })).status, 401);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: bad })).status, 401);
  const limited = await request('/api/auth/login', {
    method: 'POST', body: { email: user.email, password: PASSWORD }
  });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
});

test('invalid input is rejected and request bodies are bounded', async t => {
  const { request } = await start(t);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: {} })).status, 400);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: [] })).status, 400);
  const oversized = await fetch((await start(t)).url + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@test.example', password: 'x'.repeat(10_000) })
  });
  assert.equal(oversized.status, 413);
});

test('preflight allows exact frontend origin but excludes unrelated sites', async t => {
  const { url } = await start(t);
  const allowed = await fetch(url + '/api/auth/login', {
    method: 'OPTIONS',
    headers: { Origin: 'http://127.0.0.1:3000', 'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type' }
  });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3000');
  assert.match(allowed.headers.get('access-control-allow-headers'), /Authorization/);
  assert.equal(allowed.headers.get('access-control-allow-credentials'), null);
  const other = await fetch(url + '/api/auth/login', {
    method: 'OPTIONS',
    headers: { Origin: 'https://untrusted.example', 'Access-Control-Request-Method': 'POST' }
  });
  assert.equal(other.status, 403);
  assert.equal(other.headers.get('access-control-allow-origin'), null);
});
