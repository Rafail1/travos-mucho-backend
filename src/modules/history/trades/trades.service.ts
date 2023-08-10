import { Injectable, Logger } from '@nestjs/common';
import { AggTrades } from '@prisma/client';
import { client as WebSocketClient } from 'websocket';
import { DatabaseService } from '../../database/database.service';

interface IAggTrade {
  /** ex: aggTrade  // Event type */
  e: string;
  /**  ex: 1822767676; // Aggregate trade ID */
  a: number;
  /**  ex: 1691652206099; // Event time */
  E: number;
  /**  ex: 4000633105; // First trade ID */
  f: number;
  /**  ex: 4000633105; // Last trade ID */
  l: number;
  /**  ex: true; // Is the buyer the market maker? */
  m: boolean;
  /**  ex: '29550.20'; // Price */
  p: string;
  /**  ex: '0.018'; // Quantity */
  q: string;
  /**  ex: 'BTCUSDT'; // Symbol */
  s: string;
  /**  ex: 1691652205944; // Trade time */
  T: number;
}

class AggTrade {
  private fields: AggTrades;

  constructor(data: IAggTrade) {
    this.fields = {
      ...data,
      E: new Date(data.E),
      T: new Date(data.T),
    };
  }
}

const BUFFER_LENGTH = 1000;
@Injectable()
export class TradesService {
  private getWsTradesUrl = (symbol: string) =>
    `wss://fstream.binance.com/stream?streams=${symbol}@aggTrade`;

  private subscriptions: Record<string, WebSocketClient> = {};

  constructor(private databaseService: DatabaseService) {}

  async subscribe(symbol: string) {
    const buffer: Array<any> = [];
    this.connectWs(symbol, async (aggTrade: IAggTrade) => {
      if (!this.subscriptions[symbol]) {
        return;
      }
      buffer.push(new AggTrade(aggTrade));
      if (buffer.length > BUFFER_LENGTH) {
        await this.flush(buffer.splice(0));
      }
    });
  }

  unsubscribe(symbol: string) {
    this.subscriptions[symbol]?.abort();
    this.subscriptions[symbol] = null;
  }

  /**
   *
   * @param buffer splice of buffer (don't need to splice it again)
   */
  private async flush(buffer: any[]) {
    await this.databaseService.aggTrades.createMany({ data: buffer });

    // save buffer, clear buffer, make snapshot, save snapshot
  }

  private connectWs(symbol: string, cb: (message) => void) {
    if (this.subscriptions[symbol]) {
      Logger.warn(`subscription already exists, ${symbol}`);
      return;
    }

    this.subscriptions[symbol] = new WebSocketClient();

    this.subscriptions[symbol].on('connectFailed', function (error) {
      Logger.log(`Connect Error ${symbol}: ${error.toString()}`);
      this.subscriptions[symbol] = null;
      setTimeout(() => {
        this.subscribeTrades(symbol, cb);
      }, 2000);
    });

    this.subscriptions[symbol].on('connect', function (connection) {
      Logger.log(`WebSocket Client Connected ${symbol}`);
      connection.on('error', function (error) {
        Logger.error(`Connection Error ${symbol}: ${error.toString()}`);
      });
      connection.on('close', function () {
        Logger.warn(`Connection Closed ${symbol}`);
      });
      connection.on('message', function (message) {
        if (this.subscriptions[symbol]) {
          cb(JSON.parse(message.utf8Data).data);
        }
      });
      connection.on('ping', (cancel: () => void, binaryPayload: Buffer) => {
        Logger.log(`Received ping message ${symbol}`);
        if (this.subscriptions[symbol]) {
          connection.pong(binaryPayload);
        }
      });
    });

    this.subscriptions[symbol].connect(this.getWsTradesUrl(symbol));
  }
}
