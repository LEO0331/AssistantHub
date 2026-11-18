import { databaseConfig, serverConfig } from './config.mjs';
import { createSequelize } from './db/connection.mjs';
import { createApp } from './app.mjs';

const settings = serverConfig();
const db = createSequelize(databaseConfig());
const app = createApp({ db, corsOrigin: settings.corsOrigin });
const server = app.listen(settings.port, settings.host, () => {
  console.log('AssistantHub API listening on ' + settings.host + ':' + settings.port);
});

async function shutdown() {
  server.close(async () => {
    await db.close();
    process.exitCode = 0;
  });
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
