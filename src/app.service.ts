import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './modules/database/database.service';
import { StarterService } from './modules/starter/starter.service';
import { Prisma } from '@prisma/client';
export const TIME_WINDOW = 1000 * 30;
const CLUSTER_WINDOW = 1000 * 60 * 5;
@Injectable()
export class AppService {
  constructor(
    private readonly starterService: StarterService,
    private databaseService: DatabaseService,
  ) {}

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

  async getDepthUpdates(symbol: string, timeFrom: Date, timeTo: Date) {
    try {
      return this.databaseService.depthUpdates.findMany({
        where: {
          s: symbol,
          AND: [{ E: { gte: timeFrom } }, { E: { lt: timeTo } }],
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
    const timeFrom = partialSnapshot?.E || snapshot.E;
    const depth = await this.getDepthUpdates(
      symbol,
      timeFrom,
      new Date(time.getTime() + TIME_WINDOW),
    );

    const filteredDepth = [];
    for (const depthUpdate of depth) {
      if (depthUpdate.E.getTime() < time.getTime()) {
        (<Array<[string, string]>>depthUpdate.b).forEach((update) => {
          const existsBid = snapshot.bids.find((item) => item[0] === update[0]);
          if (!existsBid) {
            snapshot.bids.push(update);
          } else {
            existsBid[1] = update[1];
          }
        });

        (<Array<[string, string]>>depthUpdate.a).forEach((update) => {
          const existsAsk = snapshot.asks.find((item) => item[0] === update[0]);
          if (!existsAsk) {
            snapshot.asks.push(update);
          } else {
            existsAsk[1] = update[1];
          }
        });
      } else {
        filteredDepth.push(depthUpdate);
      }
    }

    if (!filteredDepth.length) {
      Logger.warn('depthUpdates not found');
    }

    return {
      depth: filteredDepth,
      snapshot,
    };
  }

  async getCluster(symbol: string, time: Date) {
    const from = new Date(time.getTime() - CLUSTER_WINDOW);
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
