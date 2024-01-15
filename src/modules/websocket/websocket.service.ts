import { Injectable, Logger } from '@nestjs/common';
import { WebsocketClient } from 'binance';
export const DEPTH_UPDATE_GAP = 100;
const MARKET = 'usdm';

export interface IDepth {
  /** Event time */
  E: number; // Event time
  /**Symbol */
  s: string;
  /**Final update ID in event */
  u: number;
  /** Final update Id in last stream(ie `u` in last stream) */
  pu: number;
  /**  Bids to be updated [ '0.0024', // Price level to be updated '10', // Quantity]*/
  b: Array<[string, string]>;
  /** Asks to be updated  [ '0.0026', // Price level to be updated '100', // Quantity] */
  a: Array<[string, string]>;
}

export interface ISnapsoht {
  lastUpdateId: bigint | number;
  symbol: string;
  E: Date;
  /**  Bids to be updated [ '0.0024', // Price level to be updated '10', // Quantity]*/
  bids: Array<[number, number]>;
  /** Asks to be updated  [ '0.0026', // Price level to be updated '100', // Quantity] */
  asks: Array<[number, number]>;
}

export class Snapshot {
  public fields: ISnapsoht;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(symbol: string, data: ISnapsoht) {
    this.fields = {
      symbol,
      ...data,
      E: new Date(data.E),
    };
  }
}
@Injectable()
export class WebSocketService {
  private listenersCnt = 0;
  wsClient: WebsocketClient;
  constructor() {
    this.wsClient = new WebsocketClient({});
  }

  subscribersCount() {
    return this.wsClient.listenerCount('');
  }

  public subscribe(symbol: string) {
    this.wsClient.subscribeDiffBookDepth(symbol, DEPTH_UPDATE_GAP, MARKET);
    this.listenersCnt++;
  }

  public unsubscribe(symbol: string) {
    Logger.warn('unsubscribe not possible');
  }

  public listen(depthCallback) {
    this.wsClient.on('message', (message: any) => {
      try {
        switch (message.e) {
          case 'depthUpdate':
            return depthCallback(message);

          default:
            Logger.warn(`unknown event ${message}`);
        }
      } catch (e) {
        Logger.debug(message);
        Logger.error(e);
      }
    });

    // notification when a connection is opened
    this.wsClient.on('open', (data) => {
      Logger.verbose('connection opened open:', data.wsKey, data.ws.target.url);
    });

    // read response to command sent via WS stream (e.g LIST_SUBSCRIPTIONS)
    this.wsClient.on('reply', (data) => {
      Logger.verbose('log reply: ', JSON.stringify(data, null, 2));
    });

    // receive notification when a ws connection is reconnecting automatically
    this.wsClient.on('reconnecting', (data) => {
      Logger.warn('ws automatically reconnecting.... ', data?.wsKey);
    });

    // receive notification that a reconnection completed successfully (e.g use REST to check for missing data)
    this.wsClient.on('reconnected', (data) => {
      Logger.warn('ws has reconnected ', data?.wsKey);
    });

    // Recommended: receive error events (e.g. first reconnection failed)
    this.wsClient.on('error', (data) => {
      Logger.error('ws saw error ', data?.wsKey);
    });
  }
}
