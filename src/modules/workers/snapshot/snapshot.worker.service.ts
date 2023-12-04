import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { interval } from 'rxjs';
import { DatabaseService } from 'src/modules/database/database.service';
import { OrderBookService } from 'src/modules/orderbook/orderbook.service';
const FULL_SNAPSHOT_INTERVAL = 60000 * 60;
const PARTIAL_SNAPSHOT_INTERVAL = 60 * 1000 * 5;
@Injectable()
export class SnapshotWorkerService {
  constructor(
    private databaseService: DatabaseService,
    private orderBookService: OrderBookService,
  ) {}
  public async initPartialSnapshotFlow() {
    interval(PARTIAL_SNAPSHOT_INTERVAL).subscribe(async () => {
      Logger.debug('start partial snapshot work');
      await this.setPartialSnapshot();
      Logger.debug('snapshot work finished');
    });
  }

  public async initSnapshotFlow() {
    interval(FULL_SNAPSHOT_INTERVAL).subscribe(async () => {
      Logger.debug('start snapshot work');
      await this.orderBookService.subscribeAll();
      Logger.debug('snapshot work finished');
    });
  }

  private async setPartialSnapshot() {
    const symbols = await this.getSymbols();
    for (const { symbol } of symbols) {
      const latestPartialSnapshot =
        await this.databaseService.partialSnapshot.findFirst({
          where: {
            s: symbol,
          },
          orderBy: { E: 'desc' },
        });

      const where: Prisma.DepthUpdatesWhereInput = { s: symbol };
      if (latestPartialSnapshot) {
        where.E = { gte: latestPartialSnapshot.E };
      }

      const depthUpdates = await this.databaseService.depthUpdates.findMany({
        where,
        orderBy: { E: 'asc' },
      });

      if (!depthUpdates.length) {
        Logger.warn(`partial, no depthUpdates for symbol ${symbol}`);
        continue;
      }

      const latestDepthUpdate = depthUpdates[depthUpdates.length - 1];
      const updates = new Map<
        string,
        { price: string; volume: string; type: string }
      >();
      const partialSnapshot = {
        E: latestDepthUpdate.E,
        s: symbol,
        asks: new Map(),
        bids: new Map(),
      };

      for (const depthUpdate of depthUpdates) {
        for (const ask of depthUpdate.a as Array<[string, string]>) {
          updates.set(ask[0], { price: ask[0], type: 'ask', volume: ask[1] });
        }

        for (const bid of depthUpdate.b as Array<[string, string]>) {
          updates.set(bid[0], { price: bid[0], type: 'bid', volume: bid[1] });
        }
      }

      for (const value of updates.values()) {
        if (value.type === 'ask') {
          partialSnapshot.asks.set(value.price, value.volume);
        } else {
          partialSnapshot.bids.set(value.price, value.volume);
        }
      }

      const asks = [...partialSnapshot.asks.entries()].sort((a, b) => {
        return Number(a[0]) - Number(b[0]) > 0 ? 1 : -1;
      });

      const bids = [...partialSnapshot.bids.entries()].sort((a, b) => {
        return Number(a[0]) - Number(b[0]) > 0 ? -1 : 1;
      });
      for (const price of partialSnapshot.asks.keys()) {
        if (partialSnapshot.bids.has(price)) {
          Logger.error(
            JSON.stringify([
              price,
              partialSnapshot.bids.get(price),
              partialSnapshot.asks.get(price),
            ]),
          );
        }
      }
      await this.databaseService.partialSnapshot.create({
        data: { ...partialSnapshot, bids, asks },
      });
    }
  }

  private async getSymbols() {
    const symbols: Array<{ symbol: string }> = await this.databaseService
      .$queryRaw`SELECT DISTINCT symbol from feautures."OrderBookSnapshot"`;
    return symbols;
  }
}
