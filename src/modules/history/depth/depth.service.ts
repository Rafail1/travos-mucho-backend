import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { client as WebSocketClient } from 'websocket';
import { DatabaseService } from '../../database/database.service';

/**
 * How to manage a local order book correctly
Open a stream to wss://fstream.binance.com/stream?streams=btcusdt@depth.
Buffer the events you receive from the stream. For same price, latest received update covers the previous one.

Get a depth snapshot from https://fapi.binance.com/fapi/v1/depth?symbol=BTCUSDT&limit=1000 .
Drop any event where u is < lastUpdateId in the snapshot.
The first processed event should have U <= lastUpdateId AND u >= lastUpdateId
While listening to the stream, each new event's pu should be equal to the previous event's u, otherwise initialize the process from step 3.

The data in each event is the absolute quantity for a price level.
If the quantity is 0, remove the price level.
Receiving an event that removes a price level that is not in your local order book can happen and is normal.
 */

const DEPTH_INTERVAL = 100;
const BUFFER_LENGTH = 500;
@Injectable()
export class DepthService {
  private getWsDepthUrl = (symbol: string) =>
    `wss://fstream.binance.com/stream?streams=${symbol}@depth@${DEPTH_INTERVAL}ms`;
  private httpDepthUrl = (symbol: string, limit = 1000) =>
    `https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}&limit=${limit}`;

  private subscriptions: Record<string, boolean> = {};

  constructor(
    private httpService: HttpService,
    private databaseService: DatabaseService,
  ) {}

  async subscribe(symbol: string) {
    const buffer: Array<any> = [];
    this.connectWs(symbol, async (depth) => {
      if (buffer.length && buffer[buffer.length - 1].u !== depth.pu) {
        Logger.warn('sequence broken');
        buffer.splice(0);
        await this.setOrderBook(symbol);
      }

      buffer.push(depth);
      if (buffer.length > BUFFER_LENGTH) {
        await this.flush(buffer.splice(0));
      }
    });

    await this.setOrderBook(symbol);
  }

  unsubscribe(symbol: string) {
    delete this.subscriptions[symbol];
  }

  private async setOrderBook(symbol: string) {
    const snapshot = await firstValueFrom(
      this.httpService.get(this.httpDepthUrl(symbol)),
    ).then(({ data }) => ({ ...data, symbol }));
    await this.databaseService.orderBookSnapshot.create({ data: snapshot });
  }

  /**
   *
   * @param buffer splice of buffer (don't need to splice it again)
   */
  private async flush(buffer: any[]) {
    await this.databaseService.depthUpdates.createMany({ data: buffer });
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
        this.subscribeBook(symbol, cb);
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
        cb(JSON.parse(message.utf8Data).data);
      });
      connection.on('ping', (cancel: () => void, binaryPayload: Buffer) => {
        Logger.log(`Received ping message ${symbol}`);
        connection.pong(binaryPayload);
      });
    });

    client.connect(this.getWsDepthUrl(symbol));
  }
}
