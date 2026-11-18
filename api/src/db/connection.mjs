import { Sequelize } from 'sequelize';

export function createSequelize(settings) {
  return new Sequelize({
    dialect: 'mysql',
    host: settings.host,
    port: settings.port,
    database: settings.database,
    username: settings.username,
    password: settings.password,
    logging: false,
    pool: { max: 5, min: 0, acquire: 10000, idle: 10000 },
    dialectOptions: { connectTimeout: 5000 }
  });
}
