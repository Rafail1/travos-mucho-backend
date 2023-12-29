import { Sequelize } from 'sequelize';
import { initOrderBookSnapshot } from './models/order-book-snapshot';
import { initBorders } from './models/borders';
import { initAggTrades } from './models/agg-trades';
import { initDepthUpdates } from './models/depth-updates';
import { Logger } from '@nestjs/common';

export const sequelize = new Sequelize(
  process.env.DATABASE_URL ||
    'postgresql://tramuches:IPFHfr6&63!-@localhost:5432/travos-muchos',
);

export async function initDB() {
  try {
    Logger.debug('Init DB start');
    await sequelize.authenticate();
    initOrderBookSnapshot(sequelize);
    initBorders(sequelize);
    initAggTrades(sequelize);
    initDepthUpdates(sequelize);
    Logger.log('Connection has been established successfully.');
  } catch (error) {
    Logger.error('Unable to connect to the database:', error);
  }
}
