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

  async getDepthUpdates(symbol: string, time: Date, lastUpdateId: bigint) {
    const where: Prisma.DepthUpdatesWhereInput = {
      s: symbol,
      U: { lte: lastUpdateId },
      u: { gte: lastUpdateId },
    };
    try {
      const update = await this.database.depthUpdates.findFirstOrThrow({
        where,
        orderBy: { U: 'asc' },
      });

      return this.database.depthUpdates.findMany({
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
}
