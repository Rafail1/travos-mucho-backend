import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueryOptionsWithType } from 'sequelize';
import { getExchangeInfo } from 'src/exchange-info';
import { initDB, sequelize } from './sequelize';

@Injectable()
export class DatabaseService implements OnModuleInit {
  public query = <T extends object>(
    sql: string,
    params?: QueryOptionsWithType<any>,
  ) => sequelize.query<T>(sql, params);
  async onModuleInit() {
    await initDB();
    try {
      await this.query(`
      CREATE TABLE IF NOT EXISTS "Borders" (
        "s" TEXT NOT NULL,
        "E" TIMESTAMP(3) NOT NULL,
        "min" DOUBLE PRECISION NOT NULL,
        "max" DOUBLE PRECISION NOT NULL
      )`);
      await this.query(
        `CREATE UNIQUE INDEX "Borders_s_key" ON "Borders"("s");`,
      );
    } catch (e) {
      Logger.debug(e?.message);
    }
  }

  async reset() {
    const symbols = getExchangeInfo();
    for (const { symbol } of symbols) {
      Logger.log(symbol);
      await this.removeTable(`OrderBookSnapshot_${symbol}`);
      await this.removeTable(`DepthUpdates_${symbol}`);
      await this.removeTable(`Borders`);
    }
    process.exit(0);
  }

  // async selectParts(table: string) {
  //   return this.query<{ part: string }>(
  //     `
  //     SELECT
  //         child.relname as part
  //     FROM pg_inherits
  //         JOIN pg_class parent            ON pg_inherits.inhparent = parent.oid
  //         JOIN pg_class child             ON pg_inherits.inhrelid   = child.oid
  //         JOIN pg_namespace nmsp_parent   ON nmsp_parent.oid  = parent.relnamespace
  //         JOIN pg_namespace nmsp_child    ON nmsp_child.oid   = child.relnamespace
  //     WHERE parent.relname='${table}'`,
  //     {
  //       type: QueryTypes.SELECT,
  //     },
  //   );
  // }

  async removeTable(table: string) {
    return this.query(`DROP TABLE IF EXISTS "${table}"`);
  }

  // async removeParts(tableName: string) {
  //   const parts = await this.selectParts(tableName);
  //   for (const { part } of parts) {
  //     await this.removeTable(part);
  //   }
  // }

  async removeTables() {
    const symbols = getExchangeInfo();
    for (const { symbol } of symbols) {
      Logger.log(symbol);
      await this.truncate(`OrderBookSnapshot_${symbol}`);
      await this.truncate(`DepthUpdates_${symbol}`);
    }
    process.exit(0);
  }

  truncate(table: string) {
    return this.query(`TRUNCATE TABLE "${table}"`);
  }

  async syncTables() {
    const symbols = getExchangeInfo();
    for (const { symbol } of symbols) {
      Logger.log(symbol);
      const createOBSql = `CREATE TABLE IF NOT EXISTS "OrderBookSnapshot_${symbol}" (
        "lastUpdateId" BIGINT NOT NULL,
        "E" TIMESTAMP(3) NOT NULL,
        "bids" JSONB,
        "asks" JSONB
    );`;

      const createDUSql = `CREATE TABLE IF NOT EXISTS "DepthUpdates_${symbol}" (
        "E" TIMESTAMP(3) NOT NULL PRIMARY KEY,
        data JSONB NOT NULL
    );`;

      await this.query(createOBSql);
      await this.query(createDUSql);
      await this.query(
        `CREATE UNIQUE INDEX "DepthUpdates_${symbol}_E_key" ON "DepthUpdates_${symbol}"("E");`,
      );

      await this.query(
        `CREATE UNIQUE INDEX "OrderBookSnapshot_${symbol}_E_key" ON "OrderBookSnapshot_${symbol}"("E");`,
      );

      // const to = this.filterTime(
      //   new Date(new Date().getTime() + 1000 * 60 * 60),
      //   1000 * 60 * 5,
      // );

      // let from = this.filterTime(new Date(), 1000 * 60 * 5);

      // while (from.getTime() <= to.getTime()) {
      //   const partitionTo = new Date(from.getTime() + 5 * 1000 * 60);
      //   await this.createPartition({
      //     parentTable: `OrderBookSnapshot_${symbol}`,
      //     from,
      //     partitionTo,
      //   });

      //   await this.createPartition({
      //     parentTable: `DepthUpdates_${symbol}`,
      //     from,
      //     partitionTo,
      //   });

      //   from = partitionTo;
      // }
    }
    process.exit(0);
  }

  // async createPartition({
  //   parentTable,
  //   from,
  //   partitionTo,
  // }: {
  //   parentTable: string;
  //   from: Date;
  //   partitionTo: Date;
  // }) {
  //   await this.query(
  //     `CREATE TABLE IF NOT EXISTS "${parentTable}_${from.getTime()}" PARTITION OF "${parentTable}"
  //   FOR VALUES FROM (:from) TO (:partitionTo);`,
  //     {
  //       type: QueryTypes.RAW,
  //       replacements: {
  //         from: from.toISOString(),
  //         partitionTo: partitionTo.toISOString(),
  //       },
  //     },
  //   );
  // }

  filterTime(time: Date, interval: number) {
    return new Date(Math.floor(time.getTime() - (time.getTime() % interval)));
  }

  filterTimestamp(time: number, interval: number) {
    return Math.floor(time - (time % interval));
  }
}
