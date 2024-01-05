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
import { Borders } from 'src/modules/database/sequelize/models/borders';

const GET_DEPTH_PERCENT_FROM_PRICE = 20;
const AGG_TRADES_BUFFER_LENGTH = 1000;
const DEPTH_BUFFER_LENGTH = 1000;
const BORDER_PERCENTAGE = 0.8;
const BORDERS_QUEUE_INTERVAL = 1000 * 30;
const FLUSH_INTERVAL = 1000 * 60;
@Injectable()
export class TradesService {
  private listening = false;
  private prices = new Map<string, number>();
  private borders = new Map<string, { min: number; max: number }>();
  private subscribedSymbols = new Set();
  private depthBuffer = new Map<string, Map<Date, Depth>>();
  private aggTradesBuffer = new Map<string, any>();
  private prevDepth = new Map<string, number>();

  constructor(
    private databaseService: DatabaseService,
    private webSocketService: WebSocketService,
  ) {
    setInterval(() => {
      this.flushFullAggTrades();
      this.flushFullDepth();
    }, FLUSH_INTERVAL);
  }

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
      this.depthBuffer.set(depth.s, new Map());
    }

    const _depthBuffer = this.depthBuffer.get(depth.s);
    // const price = this.prices.get(depth.s);
    // const maxPrice = price + (price / 100) * GET_DEPTH_PERCENT_FROM_PRICE;
    // const minPrice = price - (price / 100) * GET_DEPTH_PERCENT_FROM_PRICE;

    // depth.a = depth.a.filter((item) => Number(item[0]) < maxPrice);
    // depth.b = depth.b.filter((item) => Number(item[0]) > minPrice);
    const currentDepth = new Depth(depth);
    const prevDepth = this.prevDepth.get(depth.s);
    _depthBuffer.set(depth.E, currentDepth);

    if (prevDepth && prevDepth !== currentDepth.pu) {
      Logger.warn(`sequence broken ${depth.s} ${prevDepth}, ${currentDepth.u}`);
      // this.flushDepth([..._depthBuffer.values()]);
      // _depthBuffer.clear();
      // this.setOrderBook(depth.s, 'sequence broken');
    }

    this.prevDepth.set(depth.s, currentDepth.u);

    Logger.verbose(`this.depthBuffer: ${_depthBuffer.size}`);
    // if (_depthBuffer.size > DEPTH_BUFFER_LENGTH) {
    //   // this.flushDepth([..._depthBuffer.values()]);
    //   // _depthBuffer.clear();
    // }
  }

  aggTradesCallback(aggTrade: IAggTrade) {
    if (!this.aggTradesBuffer.has(aggTrade.s)) {
      this.aggTradesBuffer.set(aggTrade.s, []);
    }

    const _aggTradesBuffer = this.aggTradesBuffer.get(aggTrade.s);

    _aggTradesBuffer.push(new AggTrade(aggTrade).fields);

    Logger.verbose(`this.aggTradesBuffer: ${_aggTradesBuffer.length}`);
    // this.checkBorders(aggTrade);
    this.prices.set(aggTrade.s, Number(aggTrade.p));
    if (_aggTradesBuffer.length > AGG_TRADES_BUFFER_LENGTH) {
      this.flushAggTrades(_aggTradesBuffer.splice(0), aggTrade.s);
    }
  }

  // private checkBorders(aggTrade: IAggTrade) {
  //   if (this.borders[aggTrade.s]) {
  //     const topBorderIdx = Math.floor(
  //       this.borders[aggTrade.s].max.length * BORDER_PERCENTAGE,
  //     );

  //     const lowBorderIdx = Math.floor(
  //       this.borders[aggTrade.s].min.length * BORDER_PERCENTAGE,
  //     );

  //     if (
  //       Number(aggTrade.p) >
  //         Number(this.borders[aggTrade.s].max[topBorderIdx][0]) ||
  //       Number(aggTrade.p) <
  //         Number(this.borders[aggTrade.s].min[lowBorderIdx][0])
  //     ) {
  //       Logger.debug('out of borders');
  //       this.setOrderBook(aggTrade.s, 'out of borders');
  //     }
  //   }
  // }

  async flushFullDepth() {
    for (const symbol of this.depthBuffer.keys()) {
      const _depthBuffer = this.depthBuffer.get(symbol);
      if (!_depthBuffer.size) {
        continue;
      }
      const values = [..._depthBuffer.values()];
      _depthBuffer.clear();
      this.flushDepth(values, symbol);
    }
  }

  async flushFullAggTrades() {
    for (const symbol of this.aggTradesBuffer.keys()) {
      const _aggTradesBuffer = this.aggTradesBuffer.get(symbol);
      if (!_aggTradesBuffer.length) {
        continue;
      }

      this.flushAggTrades(_aggTradesBuffer.splice(0), symbol);
    }
  }
  /**
   *
   * @param buffer splice of buffer (don't need to splice it again)
   */
  private async flushAggTrades(buffer: any[], symbol: string) {
    try {
      Logger.verbose('flushAggTrades');
      while (buffer.length) {
        const data = buffer.splice(0, 20).map((item) => {
          return `('${item.a}', '${item.E.toISOString()}',
          '${item.p}', '${item.q}', ${item.m})`;
        });
        await this.databaseService.query(
          `INSERT INTO public."AggTrades_${symbol}"(
            a, "E", p, q, m)
            VALUES ${data.join(',')}`,
          {},
        );
      }
    } catch (e) {
      Logger.error(`flushAggTrades error ${e?.message}`);
    }
  }

  /**
   *
   * @param buffer splice of buffer (don't need to splice it again)
   */
  private async flushDepth(buffer: Depth[], symbol: string) {
    try {
      Logger.verbose('flushDepth');
      while (buffer.length) {
        const data = buffer.splice(0, 20).map((item) => {
          return `('${item.fields.E.toISOString()}',
           '${JSON.stringify(item.fields.b)}', 
           '${JSON.stringify(item.fields.a)}',
          '${item.fields.u}',
          '${item.fields.pu}')`;
        });
        await this.databaseService.query(
          `INSERT INTO public."DepthUpdates_${symbol}"(
          "E", b, a, u, pu)
          VALUES ${data.join(',')}`,
          {},
        );
      }
    } catch (e) {
      Logger.error(`flushDepth error ${e?.message}`);
    }
  }

  private async setOrderBook(symbol: string, reason: string) {
    // const exists = await this.databaseService.sharedAction.findFirst({
    //   where: { symbol },
    // });
    // if (exists) {
    //   await this.databaseService.sharedAction.update({
    //     where: { symbol },
    //     data: {
    //       E: new Date(),
    //       inProgress: false,
    //       reason,
    //     },
    //   });
    // } else {
    //   await this.databaseService.sharedAction
    //     .create({
    //       data: {
    //         E: new Date(),
    //         inProgress: false,
    //         symbol,
    //         reason,
    //       },
    //     })
    //     .catch((e) => {
    //       Logger.verbose(e);
    //     });
    // }
  }

  private listenBorders(symbol: string) {
    interval(BORDERS_QUEUE_INTERVAL).subscribe(async () => {
      const borders = await Borders.findOne({
        where: {
          s: symbol,
        },
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
