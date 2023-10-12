import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom, interval } from 'rxjs';
import { DatabaseService } from '../../database/database.service';
import {
  AggTrade,
  Depth,
  IAggTrade,
  IDepth,
  Snapshot,
  WebSocketService,
} from '../../websocket/websocket.service';

const AGG_TRADES_BUFFER_LENGTH = 1000;
const DEPTH_BUFFER_LENGTH = 1000;
const SNAPSHOT_INTERVAL = 90 * 1000;
const BORDER_PERCENTAGE = 0.75;
@Injectable()
export class TradesService {
  private borders = new Map<string, { min: number; max: number }>();
  private httpDepthUrl = (symbol: string, limit = 500) =>
    `https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}&limit=${limit}`;
  private orderBookSetting = new Map<string, boolean>();
  private subscribedSymbols = new Set();
  private messageQueue = [];
  constructor(
    private httpService: HttpService,
    private databaseService: DatabaseService,
    private webSocketService: WebSocketService,
  ) {
    this.listenMessageQueue();
  }

  async subscribe(symbol: string) {
    const aggTradesBuffer: Array<any> = [];
    const depthBuffer: Array<any> = [];

    this.subscribedSymbols.add(symbol);
    try {
      const connection = await this.webSocketService.getConnection(symbol);
      await connection.subscribe(
        symbol,
        async (aggTrade: IAggTrade) => {
          aggTradesBuffer.push(new AggTrade(aggTrade).fields);

          Logger.verbose(`aggTradesBuffer: ${aggTradesBuffer.length}`);
          if (this.borders[symbol]) {
            const topBorderIdx = Math.floor(
              this.borders[symbol].max.length * BORDER_PERCENTAGE,
            );

            const lowBorderIdx = Math.floor(
              this.borders[symbol].min.length * BORDER_PERCENTAGE,
            );

            if (
              Number(aggTrade.p) >
                Number(this.borders[symbol].max[topBorderIdx][0]) ||
              Number(aggTrade.p) <
                Number(this.borders[symbol].min[lowBorderIdx][0])
            ) {
              Logger.debug('out of borders');
              this.setOrderBook(symbol);
            }
          }

          if (aggTradesBuffer.length > AGG_TRADES_BUFFER_LENGTH) {
            await this.flushAggTrades(aggTradesBuffer.splice(0));
          }
        },
        async (depth: IDepth) => {
          depthBuffer.push(new Depth(depth).fields);

          if (
            depthBuffer.length > 1 &&
            depthBuffer[depthBuffer.length - 2].u !== depth.pu
          ) {
            Logger.warn(`sequence broken ${symbol}`);
            this.flushDepth(depthBuffer.splice(0));
            this.setOrderBook(symbol);
          }

          Logger.verbose(`depthBuffer: ${depthBuffer.length}`);
          if (depthBuffer.length > DEPTH_BUFFER_LENGTH) {
            this.flushDepth(depthBuffer.splice(0));
          }
        },
      );

      this.setOrderBook(symbol);
    } catch (e) {
      Logger.error(e?.message);
      return null;
    }
  }

  unsubscribe(symbol: string) {
    this.webSocketService.getConnection(symbol).then((connection) => {
      connection.unsubscribe(symbol);
    });
    this.subscribedSymbols.delete(symbol);
  }

  /**
   *
   * @param buffer splice of buffer (don't need to splice it again)
   */
  private async flushAggTrades(buffer: any[]) {
    try {
      Logger.verbose('flushAggTrades');
      await this.databaseService.aggTrades.createMany({ data: buffer });
    } catch (e) {
      Logger.error(`flushAggTrades error ${e?.message}`);
    }
  }

  /**
   *
   * @param buffer splice of buffer (don't need to splice it again)
   */
  private async flushDepth(buffer: any[]) {
    try {
      Logger.verbose('flushDepth');
      await this.databaseService.depthUpdates.createMany({ data: buffer });
    } catch (e) {
      Logger.error(`flushDepth error ${e?.message}`);
    }
  }

  private async setOrderBook(symbol: string) {
    try {
      if (this.orderBookSetting.has(symbol)) {
        return;
      }

      this.orderBookSetting[symbol] = true;
      this.messageQueue.push({
        symbol,
        cb: async (data) => {
          this.setBorders({
            symbol,
            asks: data.asks as Array<[string, string]>,
            bids: data.bids as Array<[string, string]>,
          });
          Logger.debug(`setOrderBook ${symbol}`);
          await this.databaseService.orderBookSnapshot.create({
            data,
          });
        },
      });
    } catch (e) {
      Logger.error(`setOrderBook error ${symbol}, ${e?.message}`);
    } finally {
      Logger.debug(`set timeout setOrderBook ${symbol}`);
      this.orderBookSetting.delete(symbol);
    }
  }

  private setBorders({
    symbol,
    asks,
    bids,
  }: {
    symbol: string;
    asks: Array<[string, string]>;
    bids: Array<[string, string]>;
  }) {
    if (!bids.length || !asks.length) {
      this.borders.delete(symbol);
      this.unsubscribe(symbol);
      Logger.warn(`symbol ${symbol} have empty borders`);
      return;
    }

    this.borders.set(symbol, {
      min: Number(bids[bids.length - 1][0]),
      max: Number(asks[asks.length - 1][0]),
    });
  }

  private listenMessageQueue() {
    interval(250).subscribe(async () => {
      if (this.messageQueue.length) {
        const { symbol, cb } = this.messageQueue.shift();
        const snapshot = await firstValueFrom(
          this.httpService.get(this.httpDepthUrl(symbol)),
        ).then(({ data }) => ({ ...data, symbol: symbol.toUpperCase() }));
        const data = new Snapshot(snapshot).fields;
        cb(data)
          .catch(() => {
            return;
          })
          .then(() => {
            setTimeout(() => {
              this.setOrderBook(symbol);
            }, SNAPSHOT_INTERVAL);
          });
      }
    });
  }
}
