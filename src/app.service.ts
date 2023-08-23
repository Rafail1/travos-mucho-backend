import { Injectable, Logger } from '@nestjs/common';
import { StarterService } from './modules/starter/starter.service';
import { DatabaseService } from './modules/database/database.service';

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

  getAggTradesHistory(symbol: string, from: Date, to: Date) {
    return this.database.aggTrades.findMany({
      where: {
        AND: [
          {
            E: { gte: from },
          },
          {
            E: { lt: to },
          },
        ],
        s: symbol,
      },
    });
  }

  async getDepthHistory(symbol: string, from: Date, to: Date) {
    const depth = await this.database.depthUpdates.findMany({
      where: {
        AND: [
          {
            E: { gte: from },
          },
          {
            E: { lt: to },
          },
        ],
        s: symbol,
      },
      orderBy: { U: 'asc' },
    });

    if (!depth.length) {
      Logger.warn('depthUpdates not found');
      return [];
    }

    const snapshot = this.database.orderBookSnapshot.findFirst({
      where: {
        lastUpdateId: { lte: depth[0].U },
        AND: [
          {
            E: { gte: from },
          },
          {
            E: { lt: to },
          },
        ],
        symbol,
      },
      take: 1,
      orderBy: { lastUpdateId: 'desc' },
    });

    if (!snapshot) {
      Logger.warn('snapshot not found');
      return [];
    }

    // logic for data merge
  }
}
