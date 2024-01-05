import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { initDB, sequelize } from './sequelize';
import { getExchangeInfo } from 'src/exchange-info';
import { QueryTypes } from 'sequelize';

@Injectable()
export class DatabaseService implements OnModuleInit {
  public query = <T extends object>(sql, params?) =>
    sequelize.query<T>(sql, params);
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

  async removeParts(tableName: string) {
    const selectParts = (table: string) => `
    SELECT
        child.relname as part
    FROM pg_inherits
        JOIN pg_class parent            ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child             ON pg_inherits.inhrelid   = child.oid
        JOIN pg_namespace nmsp_parent   ON nmsp_parent.oid  = parent.relnamespace
        JOIN pg_namespace nmsp_child    ON nmsp_child.oid   = child.relnamespace
    WHERE parent.relname='${table}'`;
    const removePart = (table: string) => `
    DROP TABLE IF EXISTS "${table}"`;

    const parts = await this.query<{ part: string }[]>(selectParts(tableName), {
      type: QueryTypes.SELECT,
    });
    for (const { part } of parts) {
      await this.query(removePart(part), {
        type: QueryTypes.SELECT,
      });
    }
  }

  async removeTables() {
    const symbols = getExchangeInfo();
    for (const { symbol } of symbols) {
      Logger.log(symbol);
      await this.removeParts(`OrderBookSnapshot_${symbol}`);
      await this.removeParts(`DepthUpdates_${symbol}`);
      await this.removeParts(`AggTrades_${symbol}`);
    }
    process.exit(0);
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
        new Date(new Date().getTime() + 1000 * 60 * 60 * 3),
        1000 * 60 * 5,
      );

      let from = this.filterTime(new Date(), 1000 * 60 * 5);

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
    process.exit(0);
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
      {
        replacements: {
          from: from.toISOString(),
          partitionTo: partitionTo.toISOString(),
        },
      },
    );
  }

  filterTime(time: Date, interval: number) {
    return new Date(Math.floor(time.getTime() - (time.getTime() % interval)));
  }
}
