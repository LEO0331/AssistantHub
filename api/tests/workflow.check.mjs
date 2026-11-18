import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.mjs';
import { databaseConfig } from '../src/config.mjs';
import { createSequelize } from '../src/db/connection.mjs';
import { defineModels } from '../src/db/models.mjs';
import { provisionUser } from '../src/auth/users.mjs';
import { createTokenService } from '../src/auth/tokens.mjs';
import { createWorkflowService } from '../src/services/workflowService.mjs';

const SECRET = 'ci_only_jwt_signing_secret_do_not_use_outside_tests_12345';
const DATE = new Date('2026-01-01T00:00:00.000Z');

async function harness(t) {
  assert.equal(process.env.NODE_ENV, 'test', 'Use only disposable MySQL test DB');
  const db = createSequelize(databaseConfig());
  await db.authenticate();
  const { User, Candidate, Application, AuditEvent, IdempotencyRecord } = defineModels(db);
  const fixtures = [], users = [];
  const tokens = createTokenService(SECRET);
  const server = createApp({ db, jwtSecret: SECRET }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    try {
      for (const { id, candidateId } of fixtures) {
        await IdempotencyRecord.destroy({ where: { application_id: id } });
        await AuditEvent.destroy({ where: { application_id: id } });
        await Application.destroy({ where: { id } });
        await Candidate.destroy({ where: { id: candidateId } });
      }
      if (users.length) await User.destroy({ where: { id: users } });
    } finally { await db.close(); }
  });
  return {
    db, User, Candidate, Application, AuditEvent, IdempotencyRecord,
    async fixture(status = 'New', version = 1) {
      const candidateId = randomUUID(), id = randomUUID();
      await Candidate.create({
        id: candidateId, name: 'Synthetic workflow test',
        role: 'Operations Assistant', skills: ['Documentation'],
        availability: 'Available now', hourly_rate_usd: 40,
        created_at: DATE, updated_at: DATE
      });
      fixtures.push({ id, candidateId });
      await Application.create({
        id, candidate_id: candidateId, status, version,
        created_at: DATE, updated_at: DATE
      });
      return { id, candidateId };
    },
    async actor(role) {
      const user = await provisionUser({
        User, email: role + '-' + randomUUID() + '@test.example',
        password: 'Synthetic-Workflow-Strong-Password-5678!', role
      });
      users.push(user.id);
      return { user, token: await tokens.issue(user.id) };
    },
    async request(path, { token, method = 'GET', body, headers = {} } = {}) {
      const res = await fetch(url + path, {
        method, headers: {
          ...headers,
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
      });
      return { status: res.status, json: await res.json() };
    }
  };
}
const path = id => '/api/applications/' + id;
const move = (ctx, id, token, toStatus, expectedVersion, idempotencyKey = randomUUID()) =>
  ctx.request(path(id) + '/transitions', {
    token, method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: { toStatus, expectedVersion, reason: 'Synthetic review' }
  });

test('protected application reads and Viewer cannot write', async t => {
  const ctx = await harness(t);
  const app = await ctx.fixture();
  const viewer = await ctx.actor('viewer');
  const recruiter = await ctx.actor('recruiter');
  const admin = await ctx.actor('admin');
  assert.equal((await ctx.request(path(app.id))).status, 401);
  assert.equal((await ctx.request(path(app.id) + '/audit-events')).status, 401);
  assert.equal((await ctx.request(path(app.id) + '/transitions', {
    method: 'POST', body: { toStatus: 'Contacted', expectedVersion: 1 }
  })).status, 401);
  for (const actor of [viewer, recruiter, admin]) {
    const response = await ctx.request(path(app.id), { token: actor.token });
    assert.equal(response.status, 200);
    assert.deepEqual(response.json, {
      id: app.id, candidateId: app.candidateId, status: 'New',
      version: 1, updatedAt: DATE.toISOString()
    });
  }
  const denied = await move(ctx, app.id, viewer.token, 'Contacted', 1);
  assert.equal(denied.status, 403);
  assert.equal(denied.json.error.code, 'FORBIDDEN');
  assert.equal((await ctx.AuditEvent.count({ where: { application_id: app.id } })), 0);
  assert.equal((await ctx.Application.findByPk(app.id)).version, 1);
  assert.equal((await ctx.request('/api/applications/nope', { token: viewer.token })).status, 400);
  assert.equal((await ctx.request(path(randomUUID()), { token: viewer.token })).status, 404);
  assert.equal((await ctx.request(path(randomUUID()) + '/audit-events', { token: viewer.token })).status, 404);
});

test('sequential valid transitions commit one audit per update; terminal state rejects writes', async t => {
  const ctx = await harness(t), app = await ctx.fixture(), actor = await ctx.actor('recruiter');
  const states = ['Contacted', 'Interview', 'Hired'];
  for (const [i, status] of states.entries()) {
    const res = await move(ctx, app.id, actor.token, status, i + 1);
    assert.equal(res.status, 200);
    assert.equal(res.json.application.version, i + 2);
    assert.equal(res.json.application.status, status);
    assert.match(res.json.auditEventId, /^[0-9a-f-]{36}$/i);
  }
  assert.equal((await ctx.Application.findByPk(app.id)).version, 4);
  assert.equal((await ctx.Application.findByPk(app.id)).status, 'Hired');
  const events = await ctx.AuditEvent.findAll({ where: { application_id: app.id } });
  assert.equal(events.length, 3);
  assert.deepEqual(new Set(events.map(x => x.to_status)), new Set(states));
  assert.ok(events.every(x => x.actor_id === actor.user.id && x.reason === 'Synthetic review'));
  assert.equal(new Set(events.map(x => x.request_id)).size, 3);
  assert.equal((await move(ctx, app.id, actor.token, 'Rejected', 4)).status, 422);
  assert.equal((await ctx.AuditEvent.count({ where: { application_id: app.id } })), 3);
});

test('Rejected allowed from each nonterminal state and rejected state stays terminal', async t => {
  const ctx = await harness(t), actor = await ctx.actor('admin');
  for (const status of ['New', 'Contacted', 'Interview']) {
    const app = await ctx.fixture(status, 7);
    const res = await move(ctx, app.id, actor.token, 'Rejected', 7);
    assert.equal(res.status, 200);
    assert.equal(res.json.application.version, 8);
    assert.equal((await move(ctx, app.id, actor.token, 'Interview', 8)).status, 422);
    const rows = await ctx.AuditEvent.findAll({ where: { application_id: app.id } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].from_status, status);
    assert.equal(rows[0].to_status, 'Rejected');
  }
});

test('stale versions, invalid transitions, and tampered payloads do not create audit events', async t => {
  const ctx = await harness(t), app = await ctx.fixture(), actor = await ctx.actor('recruiter');
  const stale = await move(ctx, app.id, actor.token, 'Contacted', 2);
  assert.equal(stale.status, 409);
  assert.equal(stale.json.error.code, 'VERSION_CONFLICT');
  assert.equal((await move(ctx, app.id, actor.token, 'Hired', 1)).status, 422);
  const endpoint = path(app.id) + '/transitions';
  for (const body of [
    {}, null, [], { toStatus: 'New', expectedVersion: 1 },
    { toStatus: 'Contacted', expectedVersion: 0 },
    { toStatus: 'Contacted', expectedVersion: '1' },
    { toStatus: 'Contacted', expectedVersion: 1.5 },
    { toStatus: 'Contacted', expectedVersion: 1, actorId: actor.user.id },
    { toStatus: 'Contacted', expectedVersion: 1, fromStatus: 'Interview' },
    { toStatus: 'Contacted', expectedVersion: 1, reason: 'x'.repeat(501) },
    { toStatus: 'Contacted', expectedVersion: 1, reason: '\u0000' }
  ]) {
    const response = await ctx.request(endpoint, { method: 'POST', token: actor.token, body });
    assert.equal(response.status, 400);
  }
  assert.equal((await ctx.AuditEvent.count({ where: { application_id: app.id } })), 0);
  assert.equal((await ctx.Application.findByPk(app.id)).version, 1);
  assert.equal((await move(ctx, app.id, actor.token, 'Contacted', 1)).status, 200);
  assert.equal((await move(ctx, app.id, actor.token, 'Contacted', 1)).status, 409);
  assert.equal((await ctx.AuditEvent.count({ where: { application_id: app.id } })), 1);
});

test('concurrent competing transitions serialize with one success, one conflict, one audit', async t => {
  const ctx = await harness(t);
  const recruiter = await ctx.actor('recruiter'), admin = await ctx.actor('admin');
  for (let i = 0; i < 4; i++) {
    const app = await ctx.fixture('Interview', 7);
    const results = await Promise.all([
      move(ctx, app.id, recruiter.token, 'Hired', 7),
      move(ctx, app.id, admin.token, 'Rejected', 7)
    ]);
    assert.deepEqual(results.map(x => x.status).sort(), [200, 409]);
    const current = await ctx.Application.findByPk(app.id);
    assert.equal(current.version, 8);
    assert.ok(['Hired', 'Rejected'].includes(current.status));
    const audit = await ctx.AuditEvent.findAll({ where: { application_id: app.id } });
    assert.equal(audit.length, 1);
    assert.equal(audit[0].from_status, 'Interview');
    assert.equal(audit[0].to_status, current.status);
  }
});

test('failed audit insertion rolls back MySQL application update', async t => {
  const ctx = await harness(t), app = await ctx.fixture(), actor = await ctx.actor('recruiter');
  const brokenAudit = createWorkflowService(ctx.db, {
    writeAudit: async () => { throw new Error('Synthetic audit failure'); }
  });
  await assert.rejects(
    brokenAudit.transition(app.id, {
      toStatus: 'Contacted', expectedVersion: 1, reason: 'Synthetic'
    }, actor.user.id, { idempotencyKey: randomUUID() }),
    /Synthetic audit failure/
  );
  const old = await ctx.Application.findByPk(app.id);
  assert.equal(old.status, 'New');
  assert.equal(old.version, 1);
  assert.equal((await ctx.AuditEvent.count({ where: { application_id: app.id } })), 0);
  assert.equal((await move(ctx, app.id, actor.token, 'Contacted', 1)).status, 200);
});

test('readable, paginated, ordered audit is PII-minimal, protected and not writable', async t => {
  const ctx = await harness(t), app = await ctx.fixture();
  const recruiter = await ctx.actor('recruiter'), viewer = await ctx.actor('viewer');
  for (const [index, status] of ['Contacted', 'Interview', 'Hired'].entries()) {
    assert.equal((await move(ctx, app.id, recruiter.token, status, index + 1)).status, 200);
  }
  const endpoint = path(app.id) + '/audit-events';
  const page1 = await ctx.request(endpoint + '?page=1&pageSize=2', { token: viewer.token });
  const page2 = await ctx.request(endpoint + '?page=2&pageSize=2', { token: viewer.token });
  assert.equal(page1.status, 200);
  assert.equal(page2.status, 200);
  assert.equal(page1.json.total, 3);
  assert.equal(page1.json.items.length, 2);
  assert.equal(page2.json.items.length, 1);
  const items = [...page1.json.items, ...page2.json.items];
  assert.equal(new Set(items.map(x => x.id)).size, 3);
  assert.deepEqual(new Set(items.map(x => x.toStatus)), new Set(['Contacted', 'Interview', 'Hired']));
  assert.ok(items.every(x => x.actorId === recruiter.user.id && x.applicationId === app.id));
  assert.ok(items.every(x => x.requestId.length > 10 && !('email' in x) && !('password_hash' in x)));
  assert.deepEqual(items.map(x => [x.occurredAt, x.id]), [...items]
    .sort((a,b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id))
    .map(x => [x.occurredAt, x.id]));
  for (const query of ['?page=0', '?pageSize=51', '?page=1&page=2', '?sort=desc']) {
    assert.equal((await ctx.request(endpoint + query, { token: viewer.token })).status, 400);
  }
  assert.equal((await ctx.request(endpoint, {
    token: recruiter.token, method: 'POST', body: { forged: true }
  })).status, 404);
});
