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

  const { Candidate, Application, User, AuditEvent } = defineModels(db);
  assert.equal(await Candidate.count(), DEMO_COUNT);
  assert.equal(await Application.count(), DEMO_COUNT);
  assert.equal(await User.count(), 0);
  assert.equal(await AuditEvent.count(), 0);

  // Running seed twice must not create duplicates or overwrite future workflow states.
  await seedDatabase(db);
  await seedDatabase(db);
  assert.equal(await Candidate.count(), DEMO_COUNT);
  assert.equal(await Application.count(), DEMO_COUNT);
  const firstCandidate = await Candidate.findByPk('00000000-0000-4000-8000-000000000001');
  assert.equal(firstCandidate.name, 'Demo Candidate 01');
  const application = await Application.findOne({ where: { candidate_id: firstCandidate.id } });
  assert.equal(application.status, 'New');
  assert.equal(application.version, 1);
  const cols = await db.getQueryInterface().describeTable('applications');
  assert.ok(cols.version);
  assert.ok(cols.candidate_id);
});
