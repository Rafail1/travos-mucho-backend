import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { response } from 'express';
import { firstValueFrom } from 'rxjs';
import { WebSocketClient } from 'websocket';

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
  private intervals: Record<string, NodeJS.Timer> = {};
  private orderBooks: Record<string, any> = {};
  private getWsDepthUrl = (symbol: string) =>
    `wss://fstream.binance.com/stream?streams=${symbol}@depth@${DEPTH_INTERVAL}ms`;
  private httpDepthUrl = (symbol: string, limit = 1000) =>
    `https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}&limit=${limit}`;

  constructor(private httpService: HttpService) {}

  async subscribeBook(symbol: string) {
    if (this.intervals[symbol]) {
      Logger.warn(`subscription already exists, ${symbol}`);
      return;
    }

    const buffer: Array<any> = [];
    this.connectWs(symbol, async (depth) => {
      if (buffer.length && buffer[buffer.length - 1].u !== depth.pu) {
        Logger.warn('sequence broken');
        buffer.splice(0);
        this.setOrderBook(symbol);
      }

      buffer.push(depth);
      if (buffer.length > BUFFER_LENGTH) {
        this.flush(symbol, buffer);
      }
    });

    await this.setOrderBook(symbol);
  }

  private async setOrderBook(symbol: string) {
    this.orderBooks[symbol] = await firstValueFrom(
      this.httpService.get(this.httpDepthUrl(symbol)),
    ).then((response) => response.data);
  }

  private flush(symbol: string, buffer: any[]) {
    const { lastUpdateId, asks, bids } = this.orderBooks[symbol];

    const eventItems = [];
    for (let i = 0; i < buffer.length; i++) {
      const bufferItem = buffer[i];
      if (bufferItem.u < lastUpdateId) {
        continue;
      } else if (bufferItem.U <= lastUpdateId && bufferItem.u >= lastUpdateId) {
        eventItems.concat(buffer.slice(i));
        break;
      } else {
        Logger.warn('first event not first in array');
        continue;
      }
    }

    if (!eventItems.length) {
      Logger.error('no events to flush');
      buffer.splice(0);
      return;
    }

    // go througth eventItems, calculate orderBook, set orderBook, save snapshot and buffer, clear buffer
  }

  private connectWs(symbol: string, cb: (message) => void) {
    const client = new WebSocketClient();

    client.on('connectFailed', function (error) {
      console.log('Connect Error: ' + error.toString());
    });

    client.on('connect', function (connection) {
      console.log('WebSocket Client Connected');
      connection.on('error', function (error) {
        console.log('Connection Error: ' + error.toString());
      });
      connection.on('close', function () {
        console.log('echo-protocol Connection Closed');
      });
      connection.on('message', function (message) {
        cb(message);
      });
    });

    client.connect(this.getWsDepthUrl(symbol));
  }
}
