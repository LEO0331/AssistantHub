import { databaseConfig } from '../src/config.mjs';
import { createSequelize } from '../src/db/connection.mjs';
import { defineModels } from '../src/db/models.mjs';
import { provisionUser } from '../src/auth/users.mjs';

// Operator-only command; requires env vars, never CLI password flags or seed
// accounts. No default admin password and no public signup.
async function main() {
  const { BOOTSTRAP_USER_EMAIL: email, BOOTSTRAP_USER_PASSWORD: password,
    BOOTSTRAP_USER_ROLE: role } = process.env;
  if (!email || !password || !role) {
    throw new Error('BOOTSTRAP_USER_EMAIL, BOOTSTRAP_USER_PASSWORD, and BOOTSTRAP_USER_ROLE are required');
  }
  const db = createSequelize(databaseConfig());
  try {
    await db.authenticate();
    const { User } = defineModels(db);
    const user = await provisionUser({ User, email, password, role });
    console.log('Created user ' + user.id + ' with role ' + user.role);
  } finally {
    await db.close();
  }
}
main().catch(() => {
  // No raw SQL, credentials, request bodies or password values in console logs.
  console.error('User provisioning failed. Check unique email, password policy, migrations, and connection.');
  process.exitCode = 1;
});
