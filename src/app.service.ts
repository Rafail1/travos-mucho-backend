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
      AND: [],
    };
    if (lastUpdateId) {
      (<Prisma.DepthUpdatesWhereInput[]>where.AND).push({
        U: { lte: lastUpdateId },
      });
      (<Prisma.DepthUpdatesWhereInput[]>where.AND).push({
        u: { gte: lastUpdateId },
      });
    } else {
      (<Prisma.DepthUpdatesWhereInput[]>where.AND).push({
        E: { gte: new Date(time.getTime()) },
      });
      (<Prisma.DepthUpdatesWhereInput[]>where.AND).push({
        E: { lte: new Date(time.getTime() + TIME_WINDOW) },
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

    return {
      depth,
      snapshot,
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
}
