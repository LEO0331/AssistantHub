import { databaseConfig } from '../src/config.mjs';
import { createSequelize } from '../src/db/connection.mjs';
import { createMigrator } from '../src/db/migrator.mjs';

async function main() {
  const db = createSequelize(databaseConfig());
  try {
    await db.authenticate();
    const migrated = await createMigrator(db).up();
    console.log('Migrations applied: ' + migrated.length);
  } finally {
    await db.close();
  }
}

main().catch(() => {
  // Do not echo connection errors: database credentials may appear in some drivers.
  console.error('Database migration failed; inspect database availability and schema before retrying.');
  process.exitCode = 1;
});
