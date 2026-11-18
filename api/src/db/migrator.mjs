import { Umzug, SequelizeStorage } from 'umzug';
import { up, down } from '../../migrations/001-initial.mjs';

export function createMigrator(sequelize) {
  const context = sequelize.getQueryInterface();
  return new Umzug({
    migrations: [{
      name: '001-initial',
      up: () => up(context),
      down: () => down(context)
    }],
    context,
    storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
    logger: undefined
  });
}
