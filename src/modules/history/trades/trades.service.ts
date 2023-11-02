import { Injectable, Logger } from '@nestjs/common';
import { USDMClient } from 'binance';
import { interval } from 'rxjs';
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
const DEPTH_LIMIT = 1000;
const BORDER_PERCENTAGE = 0.75;
const MESSAGE_QUEUE_INTERVAL = 500;
@Injectable()
export class TradesService {
  private listening = false;
  private borders = new Map<string, { min: number; max: number }>();
  private usdmClient = new USDMClient({});
  private orderBookSetting = new Map<string, boolean>();
  private subscribedSymbols = new Set();
  private messageQueue = [];
  private depthBuffer = new Map<string, any>();
  private aggTradesBuffer = new Map<string, any>();
  constructor(
    private databaseService: DatabaseService,
    private webSocketService: WebSocketService,
  ) {
    this.listenMessageQueue();
  }

  async subscribe(symbol: string) {
    this.subscribedSymbols.add(symbol);
    try {
      await this.webSocketService.subscribe(symbol);
      this.setOrderBook(symbol);
      this.listen();
    } catch (e) {
      Logger.error(e?.message);
      return null;
    }
  }

  unsubscribe(symbol: string) {
    this.webSocketService.unsubscribe(symbol);
    this.subscribedSymbols.delete(symbol);
  }

  listen() {
    if (this.listening) {
      return;
    }
    this.listening = true;
    this.webSocketService.listen(
      this.aggTradesCallback.bind(this),
      this.depthCallback.bind(this),
    );
  }

  depthCallback(depth: IDepth) {
    if (!this.depthBuffer.has(depth.s)) {
      this.depthBuffer.set(depth.s, []);
    }

    const _depthBuffer = this.depthBuffer.get(depth.s);
    _depthBuffer.push(new Depth(depth).fields);

    if (
      _depthBuffer.length > 1 &&
      _depthBuffer[_depthBuffer.length - 2].u !== depth.pu
    ) {
      Logger.warn(`sequence broken ${depth.s}`);
      this.flushDepth(_depthBuffer.splice(0));
      this.setOrderBook(depth.s, true);
    }

    Logger.verbose(`this.depthBuffer: ${_depthBuffer.length}`);
    if (_depthBuffer.length > DEPTH_BUFFER_LENGTH) {
      this.flushDepth(_depthBuffer.splice(0));
    }
  }

  aggTradesCallback(aggTrade: IAggTrade) {
    if (!this.aggTradesBuffer.has(aggTrade.s)) {
      this.aggTradesBuffer.set(aggTrade.s, []);
    }

    const _aggTradesBuffer = this.aggTradesBuffer.get(aggTrade.s);

    _aggTradesBuffer.push(new AggTrade(aggTrade).fields);

    Logger.verbose(`this.aggTradesBuffer: ${_aggTradesBuffer.length}`);
    if (this.borders[aggTrade.s]) {
      const topBorderIdx = Math.floor(
        this.borders[aggTrade.s].max.length * BORDER_PERCENTAGE,
      );

      const lowBorderIdx = Math.floor(
        this.borders[aggTrade.s].min.length * BORDER_PERCENTAGE,
      );

      if (
        Number(aggTrade.p) >
          Number(this.borders[aggTrade.s].max[topBorderIdx][0]) ||
        Number(aggTrade.p) <
          Number(this.borders[aggTrade.s].min[lowBorderIdx][0])
      ) {
        Logger.debug('out of borders');
        this.setOrderBook(aggTrade.s, true);
      }
    }

    if (_aggTradesBuffer.length > AGG_TRADES_BUFFER_LENGTH) {
      this.flushAggTrades(_aggTradesBuffer.splice(0));
    }
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

  private async setOrderBook(symbol: string, priority = false) {
    try {
      if (this.orderBookSetting.has(symbol)) {
        return;
      }

      this.orderBookSetting[symbol] = true;
      const obj = {
        symbol,
        cb: async (data) => {
          this.setBorders({
            symbol,
            asks: data.asks as Array<[string, string]>,
            bids: data.bids as Array<[string, string]>,
          });
          await this.databaseService.orderBookSnapshot.create({
            data,
          });
        },
      };
      if (priority) {
        this.messageQueue.unshift(obj);
      } else {
        this.messageQueue.push(obj);
      }
    } catch (e) {
      Logger.error(`setOrderBook error ${symbol}, ${e?.message}`);
    } finally {
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
    interval(MESSAGE_QUEUE_INTERVAL).subscribe(async () => {
      if (this.messageQueue.length) {
        const { symbol, cb } = this.messageQueue.shift();
        const snapshot = await this.usdmClient
          .getOrderBook({ symbol, limit: DEPTH_LIMIT })
          .then((data) => ({ ...data, symbol: symbol.toUpperCase() }))
          .catch((e) => {
            Logger.error(e?.message);
          });
        if (snapshot) {
          const data = new Snapshot(symbol, snapshot).fields;
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
      }
    });
  }
}
