import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../src/app.mjs';
import { databaseConfig } from '../src/config.mjs';
import { createSequelize } from '../src/db/connection.mjs';
import { createTokenService } from '../src/auth/tokens.mjs';
import { provisionUser } from '../src/auth/users.mjs';
import { defineModels } from '../src/db/models.mjs';
import { randomUUID } from 'node:crypto';
const TEST_SECRET = 'ci_only_jwt_signing_secret_do_not_use_outside_tests_12345';
import { DEMO_COUNT } from '../src/db/seed.mjs';

async function serve(t, corsOrigin = '') {
  assert.equal(process.env.NODE_ENV, 'test', 'Use disposable test DB only');
  const db = createSequelize(databaseConfig());
  t.after(() => db.close());
  await db.authenticate();
  const { User } = defineModels(db);
  const user = await provisionUser({ User, email: 'viewer-' + randomUUID() + '@test.example', password: 'Strong-CI-Password-For-Viewer-123!', role: 'viewer' });
  const accessToken = await createTokenService(TEST_SECRET).issue(user.id);
  const server = createApp({ db, corsOrigin, jwtSecret: TEST_SECRET }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())));
  const base = 'http://127.0.0.1:' + server.address().port;
  return {
    base,
    get: async (path, headers) => {
      const response = await fetch(base + path, { headers: { Authorization: 'Bearer ' + accessToken, ...headers } });
      const body = await response.json();
      return { status: response.status, body, headers: response.headers };
    }
  };
}

test('paginated candidate search is stable, bounded, and PII-minimal on real MySQL', async t => {
  const { get } = await serve(t);
  const first = await get('/api/candidates?page=1&pageSize=2&sort=rateDesc');
  assert.equal(first.status, 200);
  assert.equal(first.body.total, DEMO_COUNT);
  assert.equal(first.body.page, 1);
  assert.equal(first.body.pageSize, 2);
  assert.equal(first.body.items.length, 2);
  assert.deepEqual(first.body.items.map(x => x.hourlyRateUsd), [55, 50]);
  assert.deepEqual(Object.keys(first.body.items[0]).sort(),
    ['availability', 'hourlyRateUsd', 'id', 'name', 'role', 'skills']);
  assert.equal(first.body.items[0].email, undefined);
  const second = await get('/api/candidates?page=2&pageSize=2&sort=rateDesc');
  assert.equal(second.body.items.length, 2);
  assert.equal(second.body.total, first.body.total);
  assert.ok(second.body.total > 12, 'the default UI page size must show pagination');
  assert.equal(new Set([...first.body.items, ...second.body.items].map(x => x.id)).size, 4);
  const repeat = await get('/api/candidates?page=1&pageSize=2&sort=rateDesc');
  assert.deepEqual(repeat.body.items, first.body.items);
});

test('search across name, role, skills and filter combinations on MySQL', async t => {
  const { get } = await serve(t);
  const role = await get('/api/candidates?role=Project%20Coordinator');
  assert.equal(role.body.total, 1);
  assert.equal(role.body.items[0].role, 'Project Coordinator');
  const skill = await get('/api/candidates?q=ONBOARDING');
  assert.equal(skill.status, 200);
  assert.equal(skill.body.total, 1);
  assert.equal(skill.body.items[0].role, 'Customer Success Associate');
  const avail = await get('/api/candidates?availability=Available%20now&rate=over60');
  assert.equal(avail.body.total, 0);
  const rate = await get('/api/candidates?rate=under40&sort=rateAsc');
  assert.deepEqual(rate.body.items.map(x => x.hourlyRateUsd), [30, 35]);
  const noResults = await get('/api/candidates?q=%25');
  assert.equal(noResults.status, 200);
  assert.equal(noResults.body.total, 0, 'SQL LIKE wildcard must be escaped');
});

test('invalid search, rate, pagination, unknown params, and ID are rejected', async t => {
  const { get } = await serve(t);
  for (const query of [
    '?page=0', '?page=-1', '?page=1001', '?pageSize=97',
    '?pageSize=2.5', '?sort=likes', '?rate=unknown', '?q=' + 'x'.repeat(101),
    '?page=1&page=2', '?unknown=1'
  ]) {
    const response = await get('/api/candidates' + query);
    assert.equal(response.status, 400, 'Unexpected status for ' + query);
    assert.equal(response.body.error.code, 'INVALID_QUERY');
  }
  assert.equal((await get('/api/candidates/not-a-uuid')).status, 400);
  assert.equal((await get('/api/candidates/00000000-0000-4000-8000-000000000999')).status, 404);
  const detail = await get('/api/candidates/00000000-0000-4000-8000-000000000001');
  assert.equal(detail.status, 200);
  assert.equal(detail.body.name, 'Demo Candidate 01');
  assert.equal(detail.body.email, undefined);
});

test('CORS accepts only configured frontend origin and exposes no credentials', async t => {
  const { base, get } = await serve(t, 'http://127.0.0.1:3000');
  const success = await get('/api/candidates?pageSize=1', { Origin: 'http://127.0.0.1:3000' });
  assert.equal(success.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3000');
  assert.equal(success.headers.get('access-control-allow-credentials'), null);
  assert.equal(success.headers.get('cache-control'), 'no-store');
  const other = await get('/api/candidates?pageSize=1', { Origin: 'https://evil.example' });
  assert.equal(other.headers.get('access-control-allow-origin'), null);
  const denied = await fetch(base + '/api/candidates', {
    method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' }
  });
  assert.equal(denied.status, 403);
  const allowed = await fetch(base + '/api/candidates', {
    method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:3000', 'Access-Control-Request-Method': 'GET' }
  });
  assert.equal(allowed.status, 204);
});
