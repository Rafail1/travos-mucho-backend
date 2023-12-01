import { Injectable, Logger } from '@nestjs/common';
import { interval } from 'rxjs';
import { DatabaseService } from '../../database/database.service';
import {
  AggTrade,
  Depth,
  IAggTrade,
  IDepth,
  WebSocketService,
} from '../../websocket/websocket.service';

const AGG_TRADES_BUFFER_LENGTH = 1000;
const DEPTH_BUFFER_LENGTH = 1000;
const BORDER_PERCENTAGE = 0.8;
const BORDERS_QUEUE_INTERVAL = 1000 * 30;
@Injectable()
export class TradesService {
  private listening = false;
  private prices = new Map<string, number>();
  private borders = new Map<string, { min: number; max: number }>();
  private subscribedSymbols = new Set();
  private depthBuffer = new Map<string, Depth[]>();
  private aggTradesBuffer = new Map<string, any>();
  constructor(
    private databaseService: DatabaseService,
    private webSocketService: WebSocketService,
  ) {}

  async subscribe(symbol: string) {
    this.subscribedSymbols.add(symbol);
    try {
      await this.webSocketService.subscribe(symbol);
      this.listenBorders(symbol.toUpperCase());
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
    const price = this.prices.get(depth.s);
    const maxPrice = price + (price / 100) * 20;
    const minPrice = price - (price / 100) * 20;

    depth.a = depth.a.filter((item) => Number(item[0]) < maxPrice);
    depth.b = depth.b.filter((item) => Number(item[0]) > minPrice);
    _depthBuffer.push(new Depth(depth));

    if (
      _depthBuffer.length > 1 &&
      _depthBuffer[_depthBuffer.length - 2].u !== depth.pu
    ) {
      Logger.warn(`sequence broken ${depth.s}`);
      this.flushDepth(_depthBuffer.splice(0));
      this.setOrderBook(depth.s, 'sequence broken');
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
    this.checkBorders(aggTrade);
    this.prices.set(aggTrade.s, Number(aggTrade.p));
    if (_aggTradesBuffer.length > AGG_TRADES_BUFFER_LENGTH) {
      this.flushAggTrades(_aggTradesBuffer.splice(0));
    }
  }

  private checkBorders(aggTrade: IAggTrade) {
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
        this.setOrderBook(aggTrade.s, 'out of borders');
      }
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
  private async flushDepth(buffer: Depth[]) {
    try {
      Logger.verbose('flushDepth');
      await this.databaseService.depthUpdates.createMany({
        data: buffer.map((item) => item.fields),
      });
    } catch (e) {
      Logger.error(`flushDepth error ${e?.message}`);
    }
  }

  private async setOrderBook(symbol: string, reason: string) {
    const exists = await this.databaseService.sharedAction.findFirst({
      where: { symbol },
    });
    if (exists) {
      await this.databaseService.sharedAction.update({
        where: { symbol },
        data: {
          E: new Date(),
          inProgress: false,
          reason,
        },
      });
    } else {
      await this.databaseService.sharedAction
        .create({
          data: {
            E: new Date(),
            inProgress: false,
            symbol,
            reason,
          },
        })
        .catch((e) => {
          Logger.verbose(e);
        });
    }
  }

  private listenBorders(symbol: string) {
    interval(BORDERS_QUEUE_INTERVAL).subscribe(async () => {
      const borders = await this.databaseService.borders.findFirst({
        where: {
          s: symbol,
        },
        orderBy: [{ E: 'desc' }],
      });

      if (!borders) {
        Logger.debug(`empty borders ${symbol}`);
      }

      this.borders.set(symbol, {
        min: borders?.min,
        max: borders?.max,
      });
    });
  }
}
