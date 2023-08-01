import { Injectable, Logger } from '@nestjs/common';
import { WebSocketClient } from 'websocket';
import { DatabaseService } from '../../database/database.service';

const BUFFER_LENGTH = 1000;
@Injectable()
export class TradesService {
  private getWsTradesUrl = (symbol: string) =>
    `wss://fstream.binance.com/stream?streams=${symbol}@aggTrade`;

  private subscriptions: Record<string, boolean> = {};

  constructor(private databaseService: DatabaseService) {}

  async subscribeTrades(symbol: string) {
    const buffer: Array<any> = [];
    this.connectWs(symbol, (aggTrade) => {
      buffer.push(aggTrade);
      if (buffer.length > BUFFER_LENGTH) {
        this.flush(buffer.splice(0));
      }
    });
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
    this.subscriptions[symbol] = true;

    const client = new WebSocketClient();

    client.on('connectFailed', function (error) {
      Logger.log(`Connect Error ${symbol}: ${error.toString()}`);
      this.subscriptions[symbol] = false;
      setTimeout(() => {
        this.subscribeTrades(symbol, cb);
      }, 2000);
    });

    client.on('connect', function (connection) {
      Logger.log(`WebSocket Client Connected ${symbol}`);
      connection.on('error', function (error) {
        Logger.error(`Connection Error ${symbol}: ${error.toString()}`);
      });
      connection.on('close', function () {
        Logger.warn(`Connection Closed ${symbol}`);
      });
      connection.on('message', function (message) {
        cb(message);
      });
    });

    client.connect(this.getWsTradesUrl(symbol));
  }
}
