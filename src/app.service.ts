import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './modules/database/database.service';
import { StarterService } from './modules/starter/starter.service';
import { Prisma } from '@prisma/client';
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
        .$executeRaw`DELETE FROM feautures."DepthUpdates"
      WHERE "E" < now() at time zone 'utc' - interval '24h'`;
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
        s: symbol,
      },
    });
    return result;
  }

  async getDepthUpdates(symbol: string, time: Date, lastUpdateId: bigint) {
    const where: Prisma.DepthUpdatesWhereInput = {
      s: symbol,
      U: { lte: lastUpdateId },
      u: { gte: lastUpdateId },
    };
    try {
      const update = await this.databaseService.depthUpdates.findFirstOrThrow({
        where,
        orderBy: { U: 'asc' },
      });

      return this.databaseService.depthUpdates.findMany({
        where: {
          s: symbol,
          AND: [
            { E: { gte: update.E } },
            { E: { lte: new Date(time.getTime() + TIME_WINDOW) } },
          ],
        },
        orderBy: { E: 'asc' },
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
    const partialSnapshot = await this.getPartialSnapshot(
      symbol,
      time,
      snapshot.E,
    );

    if (!partialSnapshot) {
      Logger.warn('partialSnapshot not found');
    } else {
      partialSnapshot.asks.forEach((ask) => {
        const existsAsk = snapshot.asks.find((item) => item[0] === ask[0]);
        if (!existsAsk) {
          snapshot.asks.push(ask);
        } else {
          existsAsk[1] = ask[1];
        }
      });

      partialSnapshot.bids.forEach((bid) => {
        const existsBid = snapshot.bids.find((item) => item[0] === bid[0]);
        if (!existsBid) {
          snapshot.bids.push(bid);
        } else {
          existsBid[1] = bid[1];
        }
      });
    }

    const depth = await this.getDepthUpdates(
      symbol,
      time,
      snapshot.lastUpdateId,
    );

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
    return this.databaseService.orderBookSnapshot.findFirst({
      where: {
        E: { lte: time },
        symbol,
      },
      orderBy: { lastUpdateId: 'desc' },
    });
  }

  private getPartialSnapshot(symbol: string, time: Date, minTime: Date) {
    return this.databaseService.partialSnapshot.findFirst({
      where: {
        AND: [
          {
            E: { lte: time },
          },
          {
            E: { gt: minTime },
          },
        ],
        s: symbol,
      },
      orderBy: { E: 'desc' },
    });
  }
}
