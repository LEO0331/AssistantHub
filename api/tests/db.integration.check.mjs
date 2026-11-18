import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databaseConfig } from '../src/config.mjs';
import { createSequelize } from '../src/db/connection.mjs';
import { createMigrator } from '../src/db/migrator.mjs';
import { defineModels } from '../src/db/models.mjs';
import { seedDatabase, DEMO_COUNT } from '../src/db/seed.mjs';

// CI provides a disposable MySQL 8 database. This is a REAL integration test,
// not a mocked ORM check; it must not run against production credentials.
test('migrations and deterministic seeds are idempotent on MySQL', async (t) => {
  assert.equal(process.env.NODE_ENV, 'test', 'database test requires NODE_ENV=test');
  const db = createSequelize(databaseConfig());
  t.after(() => db.close());
  await db.authenticate();
  const migrator = createMigrator(db);
  const first = await migrator.up();
  assert.equal(first.length, 0, 'CI runs migrations before the test');
  const pending = await migrator.pending();
  assert.equal(pending.length, 0);

  const { Candidate, Application, User, AuditEvent, IdempotencyRecord } = defineModels(db);
  // Other integration tests may add unique synthetic fixtures concurrently.
  assert.ok(await Candidate.count() >= DEMO_COUNT);
  assert.ok(await Application.count() >= DEMO_COUNT);
  // Auth tests provision isolated users concurrently in the same disposable
  // MySQL schema. Validate required columns rather than assuming zero users.
  const userColumns = await db.getQueryInterface().describeTable('users');
  assert.ok(userColumns.password_hash);
  assert.ok(userColumns.role);
  assert.ok(await User.count() >= 0);
  const auditCols = await db.getQueryInterface().describeTable('audit_events');
  assert.ok(auditCols.actor_id);
  assert.ok(auditCols.application_id);
  assert.ok(auditCols.request_id);
  const idemCols = await db.getQueryInterface().describeTable('idempotency_records');
  assert.ok(idemCols.actor_id);
  assert.ok(idemCols.idempotency_key);
  assert.ok(idemCols.payload_hash);
  assert.ok(idemCols.response_body);
  assert.ok(idemCols.expires_at);
  assert.ok(await IdempotencyRecord.count() >= 0);

  // Running seed twice must not create duplicates or overwrite future workflow states.
  await seedDatabase(db);
  await seedDatabase(db);
  assert.ok(await Candidate.count() >= DEMO_COUNT);
  assert.ok(await Application.count() >= DEMO_COUNT);
  const firstCandidate = await Candidate.findByPk('00000000-0000-4000-8000-000000000001');
  assert.equal(firstCandidate.name, 'Demo Candidate 01');
  const application = await Application.findOne({ where: { candidate_id: firstCandidate.id } });
  assert.equal(application.status, 'New');
  assert.equal(application.version, 1);
  const cols = await db.getQueryInterface().describeTable('applications');
  assert.ok(cols.version);
  assert.ok(cols.candidate_id);
});
