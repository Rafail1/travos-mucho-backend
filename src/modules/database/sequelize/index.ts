import { Sequelize } from 'sequelize';
import { initBorders } from './models/borders';
import { Logger } from '@nestjs/common';
console.log(process.env.DATABASE_URL);
export const sequelize = new Sequelize(
  process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/travos-muchos',
  {
    benchmark: true,
    logging: process.env.logging
      ? (sql: string, timingMs?: number) =>
          console.info(`${sql} - [Execution time: ${timingMs}ms]`)
      : false,
  },
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
