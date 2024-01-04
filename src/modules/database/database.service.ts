import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { initDB, sequelize } from './sequelize';
import { AggTrades } from './sequelize/models/agg-trades';
import { Borders } from './sequelize/models/borders';
import { DepthUpdates } from './sequelize/models/depth-updates';
import { OrderBookSnapshot } from './sequelize/models/order-book-snapshot';
import { getExchangeInfo } from 'src/exchange-info';

@Injectable()
export class DatabaseService implements OnModuleInit {
  public aggTrades = AggTrades;
  public borders = Borders;
  public orderBookSnapshot = OrderBookSnapshot;
  public depthUpdates = DepthUpdates;
  public query = (sql, params?) => sequelize.query(sql, params);
  async onModuleInit() {
    await initDB();
  }

  async syncTables() {
    const symbols = getExchangeInfo();
    for (const { symbol } of symbols) {
      Logger.log(symbol);
      const createOBSql = `CREATE TABLE IF NOT EXISTS "OrderBookSnapshot_${symbol}" (
        "lastUpdateId" BIGINT NOT NULL,
        "E" TIMESTAMP(3) NOT NULL,
        "bids" JSONB[],
        "asks" JSONB[]
    ) PARTITION BY RANGE ("E");`;

      const createDUSql = `CREATE TABLE IF NOT EXISTS "DepthUpdates_${symbol}" (
        "E" TIMESTAMP(3) NOT NULL,
        "b" JSONB NOT NULL,
        "a" JSONB NOT NULL,
        "u" BIGINT NOT NULL,
        "pu" BIGINT NOT NULL
    ) PARTITION BY RANGE ("E");`;

      const createATSql = `CREATE TABLE IF NOT EXISTS "AggTrades_${symbol}" (
        "a" BIGINT NOT NULL,
        "E" TIMESTAMP(3) NOT NULL,
        "p" TEXT NOT NULL,
        "q" TEXT NOT NULL,
        "m" BOOLEAN NOT NULL
    )  PARTITION BY RANGE ("E");`;

      await this.query(createOBSql);
      await this.query(createDUSql);
      await this.query(createATSql);
      const to = this.filterTime(
        new Date(new Date().getTime() + 1000 * 60 * 60 * 48),
        1000 * 60 * 5,
      );

      let from = this.filterTime(
        new Date(new Date().getTime() - 1000 * 60 * 60 * 24),
        1000 * 60 * 5,
      );

      while (from.getTime() <= to.getTime()) {
        const partitionTo = new Date(from.getTime() + 5 * 1000 * 60);
        await this.createPartition({
          parentTable: `OrderBookSnapshot_${symbol}`,
          from,
          partitionTo,
        });

        await this.createPartition({
          parentTable: `DepthUpdates_${symbol}`,
          from,
          partitionTo,
        });

        await this.createPartition({
          parentTable: `AggTrades_${symbol}`,
          from,
          partitionTo,
        });
        from = partitionTo;
      }
    }
  }

  async createPartition({
    parentTable,
    from,
    partitionTo,
  }: {
    parentTable: string;
    from: Date;
    partitionTo: Date;
  }) {
    await this.query(
      `CREATE TABLE IF NOT EXISTS "${parentTable}_${from.getTime()}" PARTITION OF "${parentTable}"
    FOR VALUES FROM (:from) TO (:partitionTo);`,
      { replacements: { from, partitionTo } },
    );
  }

  filterTime(time: Date, interval: number) {
    return new Date(Math.floor(time.getTime() - (time.getTime() % interval)));
  }
}
