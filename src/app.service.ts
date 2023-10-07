import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './modules/database/database.service';
import { StarterService } from './modules/starter/starter.service';
import { Prisma } from '@prisma/client';
const TIME_WINDOW = 1000 * 30;
@Injectable()
export class AppService {
  constructor(
    private readonly starterService: StarterService,
    private database: DatabaseService,
  ) {}

  subscribe(symbol: string): void {
    this.starterService.subscribe(symbol);
  }

  unsubscribe(symbol: string): void {
    this.starterService.unsubscribe(symbol);
  }

  subscribeAll() {
    this.starterService.subscribeAll();
  }

  async getAggTradesHistory(symbol: string, time: Date) {
    const result = await this.database.aggTrades.findMany({
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

  async getDepthUpdates(symbol: string, time: Date, lastUpdateId?: bigint) {
    const where: Prisma.DepthUpdatesWhereInput = {
      s: symbol,
      AND: [
        {
          E: { lt: new Date(time.getTime() + TIME_WINDOW) },
        },
      ],
    };
    if (lastUpdateId) {
      (<Prisma.DepthUpdatesWhereInput[]>where.AND).push({
        U: { gte: lastUpdateId },
      });
    } else {
      (<Prisma.DepthUpdatesWhereInput[]>where.AND).push({
        E: { gte: new Date(time.getTime()) },
      });
    }
    return this.database.depthUpdates.findMany({
      where,
      orderBy: { U: 'asc' },
    });
  }

  async getDepthHistory(symbol: string, time: Date) {
    const snapshot = await this.getSnapshot(symbol, time);

    if (!snapshot) {
      Logger.warn('snapshot not found');
      return [];
    }

    const depth = await this.getDepthUpdates(
      symbol,
      time,
      snapshot.lastUpdateId,
    );

    if (!depth.length) {
      Logger.warn('depthUpdates not found');
      return [];
    }

    const { asks, bids } = this.calculateDepth(depth, snapshot);

    return {
      depth,
      lastUpdateId: snapshot.lastUpdateId,
      asks,
      bids,
    };
  }

  private getSnapshot(symbol: string, time: Date) {
    return this.database.orderBookSnapshot.findFirst({
      where: {
        E: { lte: time },
        symbol,
      },
      orderBy: { lastUpdateId: 'desc' },
    });
  }

  private mapStakan(stakan: Array<[string, string]>) {
    return stakan?.reduce((acc, [price, value]) => {
      return {
        ...acc,
        [price]: value,
      };
    }, {});
  }

  private calculateDepth(depth, snapshot) {
    const asks = this.mapStakan(<Array<[string, string]>>snapshot.asks);
    const bids = this.mapStakan(<Array<[string, string]>>snapshot.bids);
    for (const item of depth) {
      if (item.U === snapshot.lastUpdateId) {
        break;
      }

      const updateAsks = <Array<[string, string]>>item.a;
      const updateBids = <Array<[string, string]>>item.b;
      if (updateAsks.length) {
        for (const ask of updateAsks) {
          asks[ask[0]] = ask[1];
        }
      }

      if (updateBids.length) {
        for (const bid of updateBids) {
          bids[bid[0]] = bid[1];
        }
      }
    }
    return { asks, bids };
  }
}
