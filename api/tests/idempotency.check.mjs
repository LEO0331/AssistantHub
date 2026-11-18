import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.mjs';
import { databaseConfig } from '../src/config.mjs';
import { createSequelize } from '../src/db/connection.mjs';
import { defineModels } from '../src/db/models.mjs';
import { createTokenService } from '../src/auth/tokens.mjs';
import { provisionUser } from '../src/auth/users.mjs';
import { createWorkflowService } from '../src/services/workflowService.mjs';

const JWT = 'ci_only_jwt_signing_secret_do_not_use_outside_tests_12345';
const DATE = new Date('2026-01-01T00:00:00.000Z');

async function setup(t) {
  assert.equal(process.env.NODE_ENV, 'test');
  const db = createSequelize(databaseConfig());
  await db.authenticate();
  const { Candidate, Application, AuditEvent, User, IdempotencyRecord } = defineModels(db);
  const apps = [], users = [], logs = [];
  const tokens = createTokenService(JWT);
  const server = createApp({
    db, jwtSecret: JWT, requestLogger: entry => logs.push(entry)
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    try {
      for (const { applicationId, candidateId } of apps) {
        await IdempotencyRecord.destroy({ where: { application_id: applicationId } });
        await AuditEvent.destroy({ where: { application_id: applicationId } });
        await Application.destroy({ where: { id: applicationId } });
        await Candidate.destroy({ where: { id: candidateId } });
      }
      if (users.length) await User.destroy({ where: { id: users } });
    } finally { await db.close(); }
  });

  return {
    db, Application, AuditEvent, IdempotencyRecord, logs,
    async actor(role = 'recruiter') {
      const user = await provisionUser({
        User, role, email: randomUUID() + '@test.example',
        password: 'Synthetic-Idempotency-Strong-Password-012345!'
      });
      users.push(user.id);
      return { user, token: await tokens.issue(user.id) };
    },
    async fixture() {
      const candidateId = randomUUID(), applicationId = randomUUID();
      await Candidate.create({
        id: candidateId, name: 'Synthetic Idempotency Candidate',
        role: 'Operations Assistant', skills: ['Review'],
        availability: 'Available now', hourly_rate_usd: 40,
        created_at: DATE, updated_at: DATE
      });
      apps.push({ candidateId, applicationId });
      await Application.create({
        id: applicationId, candidate_id: candidateId, status: 'New',
        version: 1, created_at: DATE, updated_at: DATE
      });
      return applicationId;
    },
    async transition(applicationId, token, { key, toStatus = 'Contacted',
      expectedVersion = 1, reason = 'Synthetic review' } = {}) {
      const res = await fetch(origin + '/api/applications/' + applicationId + '/transitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key !== undefined ? { 'Idempotency-Key': key } : {}),
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: JSON.stringify({ toStatus, expectedVersion, reason })
      });
      return { status: res.status, data: await res.json(), headers: res.headers };
    }
  };
}

test('missing and malformed keys fail closed; auth and RBAC run before key checks', async t => {
  const ctx = await setup(t);
  const id = await ctx.fixture();
  const actor = await ctx.actor();
  const viewer = await ctx.actor('viewer');
  const missing = await ctx.transition(id, actor.token);
  assert.equal(missing.status, 428);
  assert.equal(missing.data.error.code, 'IDEMPOTENCY_KEY_REQUIRED');
  const invalid = await ctx.transition(id, actor.token, { key: 'not-a-valid-key' });
  assert.equal(invalid.status, 400);
  assert.equal((await ctx.transition(id, null, { key: randomUUID() })).status, 401);
  assert.equal((await ctx.transition(id, viewer.token, { key: randomUUID() })).status, 403);
  assert.equal((await ctx.Application.findByPk(id)).version, 1);
  assert.equal(await ctx.AuditEvent.count({ where: { application_id: id } }), 0);
  assert.equal(await ctx.IdempotencyRecord.count({ where: { application_id: id } }), 0);
});

test('a committed transition replays the exact response after a lost client response', async t => {
  const ctx = await setup(t);
  const id = await ctx.fixture(), actor = await ctx.actor(), key = randomUUID();
  // The first HTTP response is intentionally discarded by the caller.
  const first = await ctx.transition(id, actor.token, { key });
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('idempotency-replayed'), 'false');
  assert.equal(first.data.application.version, 2);
  const originalCorrelation = first.headers.get('x-request-id');
  assert.match(originalCorrelation, /^[0-9a-f-]{36}$/i);
  const replay = await ctx.transition(id, actor.token, { key });
  assert.equal(replay.status, 200);
  assert.equal(replay.headers.get('idempotency-replayed'), 'true');
  assert.deepEqual(replay.data, first.data);
  assert.notEqual(replay.headers.get('x-request-id'), originalCorrelation);
  assert.equal((await ctx.Application.findByPk(id)).version, 2);
  assert.equal(await ctx.AuditEvent.count({ where: { application_id: id } }), 1);
  const audit = await ctx.AuditEvent.findOne({ where: { application_id: id } });
  assert.equal(audit.request_id, originalCorrelation);
  const record = await ctx.IdempotencyRecord.findOne({
    where: { actor_id: actor.user.id, idempotency_key: key }
  });
  assert.equal(record.payload_hash.length, 64);
  assert.deepEqual(record.response_body, first.data);
  assert.ok(record.completed_at);
  assert.ok(new Date(record.expires_at) > new Date(record.created_at));
});

test('simultaneous requests with one key converge on one durable update and audit', async t => {
  const ctx = await setup(t);
  const actor = await ctx.actor();
  for (let n = 0; n < 4; n++) {
    const id = await ctx.fixture(), key = randomUUID();
    const results = await Promise.all(Array.from({ length: 3 }, () =>
      ctx.transition(id, actor.token, { key })));
    assert.deepEqual(results.map(x => x.status), [200, 200, 200]);
    assert.equal(results.filter(x => x.headers.get('idempotency-replayed') === 'false').length, 1);
    assert.equal(results.filter(x => x.headers.get('idempotency-replayed') === 'true').length, 2);
    assert.deepEqual(results[0].data, results[1].data);
    assert.deepEqual(results[1].data, results[2].data);
    assert.equal((await ctx.Application.findByPk(id)).version, 2);
    assert.equal(await ctx.AuditEvent.count({ where: { application_id: id } }), 1);
    assert.equal(await ctx.IdempotencyRecord.count({ where: { application_id: id } }), 1);
  }
});

test('same actor reusing key for another payload or application fails without writes', async t => {
  const ctx = await setup(t);
  const actor = await ctx.actor(), id = await ctx.fixture(), other = await ctx.fixture();
  const key = randomUUID();
  assert.equal((await ctx.transition(id, actor.token, { key })).status, 200);
  for (const request of [
    { key, reason: 'Different note' },
    { key, toStatus: 'Rejected' },
    { key, expectedVersion: 2 }
  ]) {
    const response = await ctx.transition(id, actor.token, request);
    assert.equal(response.status, 409);
    assert.equal(response.data.error.code, 'IDEMPOTENCY_KEY_REUSED');
  }
  const collision = await ctx.transition(other, actor.token, { key });
  assert.equal(collision.status, 409);
  assert.equal(collision.data.error.code, 'IDEMPOTENCY_KEY_REUSED');
  assert.equal((await ctx.Application.findByPk(other)).version, 1);
  assert.equal((await ctx.Application.findByPk(id)).version, 2);
  assert.equal(await ctx.AuditEvent.count({ where: { application_id: id } }), 1);
});

test('keys are scoped to actor: two different users can safely use the same key', async t => {
  const ctx = await setup(t);
  const a = await ctx.actor('recruiter'), b = await ctx.actor('admin');
  const key = randomUUID(), idA = await ctx.fixture(), idB = await ctx.fixture();
  const first = await ctx.transition(idA, a.token, { key });
  const second = await ctx.transition(idB, b.token, { key });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(second.headers.get('idempotency-replayed'), 'false');
  assert.equal(await ctx.IdempotencyRecord.count({ where: { idempotency_key: key } }), 2);
});

test('audit failure rolls back status, audit and idempotency claim; same key may retry', async t => {
  const ctx = await setup(t);
  const id = await ctx.fixture(), actor = await ctx.actor(), key = randomUUID();
  const broken = createWorkflowService(ctx.db, {
    writeAudit: async () => { throw new Error('Simulated audit persistence failure'); }
  });
  await assert.rejects(broken.transition(id, {
    toStatus: 'Contacted', expectedVersion: 1, reason: 'Synthetic review'
  }, actor.user.id, { idempotencyKey: key }), /Simulated audit persistence failure/);
  assert.equal((await ctx.Application.findByPk(id)).version, 1);
  assert.equal(await ctx.AuditEvent.count({ where: { application_id: id } }), 0);
  assert.equal(await ctx.IdempotencyRecord.count({ where: { application_id: id } }), 0);
  const retry = await ctx.transition(id, actor.token, { key });
  assert.equal(retry.status, 200);
  assert.equal(retry.headers.get('idempotency-replayed'), 'false');
  assert.equal(await ctx.AuditEvent.count({ where: { application_id: id } }), 1);
});

test('structured HTTP logs expose only allowlisted metadata and a server-owned request ID', async t => {
  const ctx = await setup(t);
  const id = await ctx.fixture(), actor = await ctx.actor(), key = randomUUID();
  const secretReason = 'Confidential-Reason-Sample';
  const result = await ctx.transition(id, actor.token, { key, reason: secretReason });
  assert.equal(result.status, 200);
  await new Promise(resolve => setImmediate(resolve));
  const logged = ctx.logs.find(row => row.requestId === result.headers.get('x-request-id'));
  assert.ok(logged);
  assert.equal(logged.event, 'http_request_completed');
  assert.equal(logged.method, 'POST');
  assert.equal(logged.status, 200);
  assert.equal(logged.role, 'recruiter');
  assert.equal(logged.outcome, 'committed');
  assert.ok(Number.isFinite(logged.durationMs));
  const rendered = JSON.stringify(logged);
  for (const forbidden of [actor.token, key, id, secretReason, actor.user.email,
    'Authorization', 'password_hash', 'cookie', 'SQL']) {
    assert.equal(rendered.includes(forbidden), false, 'Leaked sensitive input to log');
  }
  await ctx.transition(id, actor.token, { key });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(ctx.logs.some(row => row.outcome === 'replay' && row.status === 200));
});
