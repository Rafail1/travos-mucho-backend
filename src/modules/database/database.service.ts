import { Injectable, OnModuleInit } from '@nestjs/common';
import { initDB } from './sequelize';
import { AggTrades } from './sequelize/models/agg-trades';
import { Borders } from './sequelize/models/borders';
import { DepthUpdates } from './sequelize/models/depth-updates';
import { OrderBookSnapshot } from './sequelize/models/order-book-snapshot';

@Injectable()
export class DatabaseService implements OnModuleInit {
  public aggTrades = AggTrades;
  public borders = Borders;
  public orderBookSnapshot = OrderBookSnapshot;
  public depthUpdates = DepthUpdates;

  async onModuleInit() {
    await initDB();
  }
}
