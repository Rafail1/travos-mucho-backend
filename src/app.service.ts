import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './modules/database/database.service';
import { StarterService } from './modules/starter/starter.service';
import { Prisma, Symbol } from '@prisma/client';
import { makeSymbol } from './utils/helper';
export const TIME_WINDOW = 1000 * 30;
@Injectable()
export class AppService {
  constructor(
    private readonly starterService: StarterService,
    private databaseService: DatabaseService,
  ) {}

  subscribe(symbol: string): void {
    this.starterService.subscribe(symbol);
  }

  unsubscribe(symbol: string): void {
    this.starterService.unsubscribe(symbol);
  }

  subscribeAll() {
    return this.starterService.subscribeAll();
  }

  async removeHistory() {
    try {
      await this.databaseService.$executeRaw`DELETE FROM feautures."AggTrades"
      WHERE "E" < now() at time zone 'utc' - interval '24h'`;
      await this.databaseService
        .$executeRaw`DELETE FROM feautures."DepthUpdatesNew"
      WHERE "time" < now() at time zone 'utc' - interval '24h'`;
      await this.databaseService
        .$executeRaw`DELETE FROM feautures."OrderBookSnapshot"
      WHERE "E" < now() at time zone 'utc' - interval '24h'`;
      return true;
    } catch (e) {
      Logger.error(`removeHistory error ${e?.message}`);
      return false;
    }
  }

  async getAggTradesHistory(symbol: string, time: Date) {
    const result = await this.databaseService.aggTrades.findMany({
      where: {
        AND: [
          {
            E: { gte: time },
          },
          {
            E: { lt: new Date(time.getTime() + TIME_WINDOW) },
          },
        ],
        s: makeSymbol(symbol),
      },
    });
    return result;
  }

  async getDepthUpdates(symbol: string, time: Date) {
    try {
      const s = makeSymbol(symbol);
      const where: Prisma.DepthUpdatesWhereInput = {
        s,
        AND: [
          { time: { gte: time } },
          { time: { lte: new Date(time.getTime() + TIME_WINDOW) } },
        ],
      };
      return this.databaseService.depthUpdates.findMany({
        where,
        orderBy: { time: 'asc' },
      });
    } catch (e) {
      return [];
    }
  }

  async getDepthHistory(symbol: string, time: Date) {
    const snapshot = await this.getSnapshot(symbol, time);

    if (!snapshot) {
      Logger.warn('snapshot not found');
      return {};
    }

    const depth = await this.getDepthUpdates(symbol, time);

    if (!depth.length) {
      Logger.warn('depthUpdates not found');
      return {};
    }

    return {
      depth,
      snapshot,
    };
  }

  async getCluster(symbol: string, time: Date) {
    const from = new Date(time.getTime() - 1000 * 60 * 5);
    const clusters = await this.databaseService.$queryRaw`
    SELECT p, sum(q::DECIMAL) as volume, m, date_bin('5 min', "E", ${new Date(
      from,
    )}) AS min5_slot
    FROM feautures."AggTrades"
    WHERE s = ${symbol}
    AND "E" >= ${from.toISOString()}::timestamp
    AND "E" <= ${time.toISOString()}::timestamp
    GROUP BY min5_slot, p, m`;
    return clusters;
  }

  private getSnapshot(symbol: string, time: Date) {
    return false;
    /**
     * SELECT DISTINCT ON (price) price, * from depthUpdates WHERE s = makeSymbol(symbol)
     * AND time: { lte: time },
     * orderBy: { time: 'desc' }
     */
    // const s =  makeSymbol(symbol)
    // return this.databaseService.depthUpdates.findMany({
    //   where: {
    //     time: { lte: time },
    //     s,
    //   },
    //   orderBy: { time: 'desc' },
    // });
  }
}
