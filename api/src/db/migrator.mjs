import { Umzug, SequelizeStorage } from 'umzug';
import { up, down } from '../../migrations/001-initial.mjs';
import { up as up002, down as down002 } from '../../migrations/002-idempotency.mjs';

export function createMigrator(sequelize) {
  const context = sequelize.getQueryInterface();
  return new Umzug({
    migrations: [{
      name: '001-initial',
      up: () => up(context),
      down: () => down(context)
    }, {
      name: '002-idempotency',
      up: () => up002(context),
      down: () => down002(context)
    }],
    context,
    storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
    logger: undefined
  });
}
