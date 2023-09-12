import { Injectable, Logger } from '@nestjs/common';
import { StarterService } from './modules/starter/starter.service';
import { DatabaseService } from './modules/database/database.service';
const TIME_WINDOW = 30;
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
            E: { lt: new Date(time.getTime() + 1000 * TIME_WINDOW) },
          },
        ],
        s: symbol,
      },
    });
    return result;
  }

  async getDepthUpdates(symbol: string, time: Date) {
    const depth = await this.database.depthUpdates.findMany({
      where: {
        AND: [
          {
            E: { gt: time },
          },
          {
            E: { lt: new Date(time.getTime() + 1000 * TIME_WINDOW) },
          },
        ],
        s: symbol,
      },
      orderBy: { U: 'asc' },
    });
    return depth;
  }

  async getDepthHistory(symbol: string, time: Date) {
    const snapshot = await this.database.orderBookSnapshot.findFirst({
      where: {
        E: { lte: time },
        symbol,
      },
      orderBy: { lastUpdateId: 'desc' },
    });

    if (!snapshot) {
      Logger.warn('snapshot not found');
      return [];
    }

    const depth = await this.database.depthUpdates.findMany({
      where: {
        AND: [
          {
            U: { gte: snapshot.lastUpdateId },
          },
          {
            E: { lt: new Date(time.getTime() + 1000 * TIME_WINDOW) },
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

    return { snapshot, depth };
  }
}
