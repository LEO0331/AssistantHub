import { databaseConfig } from '../src/config.mjs';
import { createSequelize } from '../src/db/connection.mjs';
import { seedDatabase } from '../src/db/seed.mjs';

async function main() {
  const db = createSequelize(databaseConfig());
  try {
    await db.authenticate();
    const result = await seedDatabase(db);
    console.log('Synthetic seed complete: ' + result.candidates + ' candidates, ' + result.applications + ' applications');
  } finally {
    await db.close();
  }
}

main().catch(() => {
  console.error('Synthetic seed failed; verify migrations and database connectivity.');
  process.exitCode = 1;
});
