import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app.mjs';
import { databaseConfig, serverConfig } from '../src/config.mjs';
const TEST_SECRET = 'ci_only_jwt_signing_secret_do_not_use_outside_tests_12345';

async function baseUrl(t, db) {
  const server = createApp({ db, jwtSecret: TEST_SECRET }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) =>
    server.close((err) => err ? reject(err) : resolve())
  ));
  return 'http://127.0.0.1:' + server.address().port;
}

test('liveness does not require a working database and does not expose framework headers', async (t) => {
  const url = await baseUrl(t, { authenticate: async () => { throw new Error('secrets must stay private'); } });
  const res = await fetch(url + '/api/health/live');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('readiness succeeds with reachable database', async (t) => {
  const url = await baseUrl(t, { authenticate: async () => {} });
  const res = await fetch(url + '/api/health/ready');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('readiness fails closed without leaking connection details or enabling public candidate access', async (t) => {
  const url = await baseUrl(t, { authenticate: async () => { throw new Error('password=secret-db'); } });
  const res = await fetch(url + '/api/health/ready');
  assert.equal(res.status, 503);
  const body = await res.text();
  assert.deepEqual(JSON.parse(body), { status: 'unavailable' });
  assert.doesNotMatch(body, /secret-db|password/);
  const blocked = await fetch(url + '/api/candidates');
  assert.equal(blocked.status, 401);
  assert.equal((await blocked.json()).error.code, 'UNAUTHORIZED');
});

test('configuration requires explicit database credentials and rejects invalid ports', () => {
  assert.throws(() => databaseConfig({ DB_HOST: '127.0.0.1', DB_NAME: 'demo', DB_USER: 'demo' }), /DB_PASSWORD/);
  assert.throws(() => databaseConfig({ DB_HOST: '127.0.0.1', DB_NAME: 'demo', DB_USER: 'demo', DB_PASSWORD: 'ok', DB_PORT: '0' }), /DB_PORT/);
});


test('local-only API bind rejects wildcard, external and public listener addresses', () => {
  const env = { AUTH_JWT_SECRET: TEST_SECRET };
  for (const host of ['0.0.0.0', '::', '192.168.1.2', 'example.com', 'api.example.org']) {
    assert.throws(() => serverConfig({ ...env, API_HOST: host }), /API_HOST must be loopback/);
  }
  for (const host of ['127.0.0.1', '::1', 'localhost']) {
    assert.equal(serverConfig({ ...env, API_HOST: host }).host, host);
  }
  assert.equal(serverConfig(env).host, '127.0.0.1');
});

test('API security and no-store response headers cover happy, error and malformed JSON paths', async t => {
  const url = await baseUrl(t, { authenticate: async () => {} });
  const health = await fetch(url + '/api/health/live');
  const invalid = await fetch(url + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not-json'
  });
  const notFound = await fetch(url + '/api/not-real');
  for (const response of [health, invalid, notFound]) {
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.match(response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/i);
  }
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, 'INVALID_JSON');
  assert.equal(notFound.status, 404);
});
