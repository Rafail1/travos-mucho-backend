import { Injectable, Logger } from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { getExchangeInfo } from './exchange-info';
import { DatabaseService } from './modules/database/database.service';
import { StarterService } from './modules/starter/starter.service';
import { IDepth, ISnapsoht } from './modules/websocket/websocket.service';
export const TIME_WINDOW = 1000 * 30;
@Injectable()
export class AppService {
  private interval;
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

  async removeHistoryInterval() {
    try {
      if (this.interval) {
        clearInterval(this.interval);
      }
    } catch (e) {
      Logger.error(e?.message);
    }

    this.interval = setInterval(async () => {
      await this.removeHistory();
    }, 1000 * 60 * 15);
    return await this.removeHistory();
  }

  async getDepthUpdates(symbol: string, time: Date) {
    try {
      const result = await this.databaseService.query<any>(
        `SELECT * FROM "DepthUpdates_${symbol}" WHERE "E" = :time`,
        {
          replacements: { time: new Date(time.getTime() + TIME_WINDOW) },
          type: QueryTypes.SELECT,
        },
      );

      return result?.[0]?.data;
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

    return {
      depth,
      snapshot,
    };
  }

  private async removeHistory() {
    try {
      const symbols = getExchangeInfo();
      Logger.debug(
        `removeHistory symbols length ${
          symbols.length
        }, first: ${JSON.stringify(symbols[0] || '')}`,
      );

      for (const { symbol: s } of symbols) {
        Logger.debug(`removeHistory from DepthUpdates`);
        await this.deleteHistoryForTable(`DepthUpdates_${s}`);
        Logger.debug(`removeHistory from OrderBookSnapshot`);
        await this.deleteHistoryForTable(`OrderBookSnapshot_${s}`);
        // Logger.debug(`removeHistory from Borders`);
        // await this.databaseService.query(
        //   `DELETE FROM public."Borders"
        //   WHERE "E" < now() at time zone 'utc' - :saveHistoryFor::interval AND s = :s`,
        //   { type: QueryTypes.DELETE, replacements: { s, saveHistoryFor } },
        // );
        // Logger.debug(`removeHistory for ${s} done`);
        Logger.debug(`vacuum from DepthUpdates`);
        await this.vacuum(`DepthUpdates_${s}`);
        Logger.debug(`vacuum from OrderBookSnapshot`);
        await this.vacuum(`OrderBookSnapshot_${s}`);
        Logger.debug(`vacuum for ${s} done`);
      }

      return true;
    } catch (e) {
      Logger.error(`removeHistory error ${e?.message}`);
      return false;
    }
  }

  private async vacuum(table: string) {
    await this.databaseService.query(`VACUUM (VERBOSE, ANALYZE) "${table}"`);
  }

  private async deleteHistoryForTable(table: string) {
    await this.databaseService.query(
      `DELETE FROM "${table}" WHERE "E" <= '${new Date(
        new Date().getTime() - 1000 * 60 * 60 * 24,
      ).toISOString()}'`,
    );
  }

  private updateSnapshot(items, snapshotItems) {
    items.forEach((leftItem) => {
      const existsIndex = snapshotItems.findIndex(
        (item) => item[0] === leftItem[0],
      );

      if (existsIndex === -1) {
        snapshotItems.push(leftItem);
      } else {
        snapshotItems[existsIndex] = leftItem;
      }
    });
  }

  private async getSnapshot(symbol: string, time: Date) {
    const result = await this.databaseService.query<ISnapsoht>(
      `SELECT * FROM "OrderBookSnapshot_${symbol}" WHERE "E" < :time ORDER BY "lastUpdateId" DESC LIMIT 1`,
      {
        replacements: { time },
        type: QueryTypes.SELECT,
      },
    );
    return result[0];
  }

  private checkConsistency(
    asks: Array<[string, string]>,
    bids: Array<[string, string]>,
  ) {
    const asksMap = asks.reduce((acc, item) => {
      acc.set(item[0], item[1]);
      return acc;
    }, new Map());

    const bidsMap = bids.reduce((acc, item) => {
      acc.set(item[0], item[1]);
      return acc;
    }, new Map());
    const errors = [];
    for (const [bidPrice, bidVolume] of bids) {
      const askVolume = asksMap.get(bidPrice) || '0';
      if (Number(bidVolume) !== 0 && Number(askVolume) !== 0) {
        errors.push({ bidPrice, bidVolume, askVolume });
      }
    }

    for (const [askPrice, askVolume] of asks) {
      const bidVolume = bidsMap.get(askPrice) || '0';
      if (Number(askVolume) !== 0 && Number(bidVolume) !== 0) {
        errors.push({ askPrice, askVolume, bidVolume });
      }
    }

    if (errors.length) {
      throw 'errors';
    }
  }
}
