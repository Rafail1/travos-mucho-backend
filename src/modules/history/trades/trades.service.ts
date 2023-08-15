import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../../database/database.service';
import {
  AggTrade,
  Depth,
  IAggTrade,
  Snapshot,
  WebSocketService,
} from '../../websocket/websocket.service';

const AGG_TRADES_BUFFER_LENGTH = 1000;
const DEPTH_BUFFER_LENGTH = 1000;
@Injectable()
export class TradesService {
  private httpDepthUrl = (symbol: string, limit = 1000) =>
    `https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}&limit=${limit}`;

  constructor(
    private httpService: HttpService,
    private databaseService: DatabaseService,
    private webSocketService: WebSocketService,
  ) {}

  async subscribe(symbol: string) {
    const aggTradesBuffer: Array<any> = [];
    const depthBuffer: Array<any> = [];
    try {
      await this.webSocketService.subscribe(
        symbol,
        async (aggTrade: IAggTrade) => {
          aggTradesBuffer.push(new AggTrade(aggTrade).fields);

          Logger.verbose(`aggTradesBuffer: ${aggTradesBuffer.length}`);
          if (aggTradesBuffer.length > AGG_TRADES_BUFFER_LENGTH) {
            await this.flushAggTrades(aggTradesBuffer.splice(0));
          }
        },
        async (depth) => {
          depthBuffer.push(new Depth(depth).fields);

          if (
            depthBuffer.length > 1 &&
            depthBuffer[depthBuffer.length - 2].u !== depth.pu
          ) {
            Logger.warn('sequence broken');
            await this.flushDepth(depthBuffer.splice(0));
            await this.setOrderBook(symbol);
          }

          Logger.verbose(`depthBuffer: ${depthBuffer.length}`);
          if (depthBuffer.length > DEPTH_BUFFER_LENGTH) {
            await this.flushDepth(depthBuffer.splice(0));
          }
        },
      );

      setInterval(() => {
        this.setOrderBook(symbol).catch((e) => {
          Logger.error(e?.message);
        });
      }, 1000 * 60 * 10);
      this.setOrderBook(symbol);
    } catch (e) {
      Logger.error(e?.message);
      return null;
    }
  }

  unsubscribe(symbol: string) {
    this.webSocketService.unsubscribe(symbol);
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
      Logger.verbose(`setOrderBook ${symbol}`);
      const snapshot = await firstValueFrom(
        this.httpService.get(this.httpDepthUrl(symbol)),
      ).then(({ data }) => ({ ...data, symbol }));

      await this.databaseService.orderBookSnapshot.create({
        data: new Snapshot(snapshot).fields,
      });
    } catch (e) {
      Logger.error(`setOrderBook error ${symbol}, ${e?.message}`);
    }
  }
}
