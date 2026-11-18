import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app.mjs';
import { databaseConfig } from '../src/config.mjs';
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
