import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './modules/database/database.service';
import { StarterService } from './modules/starter/starter.service';
import { Prisma } from '@prisma/client';
import { getExchangeInfo } from './exchange-info';
import { QueryTypes } from 'sequelize';
export const TIME_WINDOW = 1000 * 30;
const CLUSTER_WINDOW = 1000 * 60 * 5;
const saveHistoryFor = '24h';
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
    }, 1000 * 60 * 60 * 24);
    return await this.removeHistory();
  }

  async getAggTradesHistory(symbol: string, time: Date) {
    const result = await this.databaseService.aggTrades.findAll({
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
      return this.databaseService.depthUpdates.findAll({
        where: {
          s: symbol,
          AND: [{ E: { gte: timeFrom } }, { E: { lt: timeTo } }],
        },
        order: ['E', 'asc'],
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

    const timeFrom = snapshot.E;
    const depth = await this.getDepthUpdates(
      symbol,
      timeFrom,
      new Date(time.getTime() + TIME_WINDOW),
    );

    const filteredDepth = [];
    for (const depthUpdate of depth) {
      if (depthUpdate.E.getTime() <= time.getTime()) {
        this.updateSnapshot(depthUpdate.a, snapshot.asks);
        this.updateSnapshot(depthUpdate.b, snapshot.bids);
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
    const clusters = await this.databaseService.query(
      `
    SELECT p, sum(q::DECIMAL) as volume, m, date_bin('5 min', "E", :from) AS min5_slot
    FROM feautures."AggTrades"
    WHERE s = :symbol
    AND "E" >= :from
    AND "E" <= :time
    GROUP BY min5_slot, p, m`,
      { type: QueryTypes.SELECT, replacements: { symbol, from, time } },
    );
    return clusters;
  }

  private async removeHistory() {
    try {
      Logger.debug(`removeHistory from AggTrades`);
      const symbols = getExchangeInfo();
      Logger.debug(
        `removeHistory symbols length ${
          symbols.length
        }, first: ${JSON.stringify(symbols[0] || '')}`,
      );

      for (const { symbol: s } of symbols) {
        Logger.debug(`removeHistory for ${s}`);

        await this.databaseService.query(
          `DELETE FROM feautures."AggTrades"
          WHERE "E" < now() at time zone 'utc' - :saveHistoryFor AND s = :s`,
          { type: QueryTypes.DELETE, replacements: { s, saveHistoryFor } },
        );
        Logger.debug(`removeHistory from DepthUpdates`);

        await this.databaseService.query(
          `DELETE FROM feautures."DepthUpdates"
          WHERE "E" < now() at time zone 'utc' - :saveHistoryFor AND s = :s`,
          { type: QueryTypes.DELETE, replacements: { s, saveHistoryFor } },
        );
        Logger.debug(`removeHistory from OrderBookSnapshot`);

        await this.databaseService.query(
          `DELETE FROM feautures."OrderBookSnapshot"
          WHERE "E" < now() at time zone 'utc' - :saveHistoryFor AND symbol = :s`,
          { type: QueryTypes.DELETE, replacements: { s, saveHistoryFor } },
        );
        Logger.debug(`removeHistory from Borders`);

        await this.databaseService.query(
          `DELETE FROM feautures."Borders"
          WHERE "E" < now() at time zone 'utc' - :saveHistoryFor AND s = :s`,
          { type: QueryTypes.DELETE, replacements: { s, saveHistoryFor } },
        );
        Logger.debug(`removeHistory for ${s} done`);
      }

      return true;
    } catch (e) {
      Logger.error(`removeHistory error ${e?.message}`);
      return false;
    }
  }
  private updateSnapshot(items, snapshotItems) {
    items.forEach((leftItem) => {
      const existsIndex = snapshotItems.findIndex(
        (item) => Number(item[0]) === Number(leftItem[0]),
      );

      if (existsIndex === -1) {
        snapshotItems.push(leftItem);
      } else {
        snapshotItems[existsIndex] = leftItem;
      }
    });
  }

  private getSnapshot(symbol: string, time: Date) {
    return this.databaseService.orderBookSnapshot.findOne({
      where: {
        E: { lte: time },
        symbol,
      },
      order: ['lastUpdateId', 'desc'],
    });
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
