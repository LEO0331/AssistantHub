import { Op } from 'sequelize';
import { databaseConfig } from '../src/config.mjs';
import { createSequelize } from '../src/db/connection.mjs';
import { defineModels } from '../src/db/models.mjs';

// OPERATOR-ONLY retention job. No automatic pruning on HTTP requests.
// Idempotency guarantee lasts while an entry exists (at least seven days).
// Do not use this task without reviewing retention and active clients.
async function main() {
  const db = createSequelize(databaseConfig());
  try {
    await db.authenticate();
    const { IdempotencyRecord } = defineModels(db);
    const removed = await IdempotencyRecord.destroy({
      where: {
        expires_at: { [Op.lt]: new Date() },
        completed_at: { [Op.ne]: null }
      },
      limit: 500
    });
    console.log('Expired completed idempotency records pruned: ' + removed);
  } finally {
    await db.close();
  }
}
main().catch(() => {
  // No database host, credentials, SQL or request body in console output.
  console.error('Idempotency pruning failed; check database and migration status.');
  process.exitCode = 1;
});
