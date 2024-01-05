import { Sequelize } from 'sequelize';
import { initBorders } from './models/borders';
import { Logger } from '@nestjs/common';

export const sequelize = new Sequelize(
  process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/travos-muchos',
  { benchmark: true, logging: console.log },
);

export async function initDB() {
  try {
    Logger.debug('Init DB start');
    await sequelize.authenticate();
    initBorders(sequelize);
    Logger.log('Connection has been established successfully.');
  } catch (error) {
    console.error(error);
    Logger.error('Unable to connect to the database:', error);
  }
}
