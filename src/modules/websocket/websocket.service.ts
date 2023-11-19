import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Symbol as SymbolType } from '@prisma/client';
import { OrderBookRow, WebsocketClient } from 'binance';
import { makeSymbol } from 'src/utils/helper';
export const DEPTH_UPDATE_GAP = 100;
const MARKET = 'usdm';
export class AggTrade {
  public fields: Prisma.AggTradesCreateInput;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor({ E, a, s, p, q, m }: IAggTrade) {
    this.fields = {
      a,
      s: makeSymbol(s),
      p: Number(p),
      q: Number(q),
      m,
      E: new Date(E),
    };
  }
}

export interface ISnapshot {
  symbol: SymbolType;
  lastUpdateId: number;
  E: number;
  T: number;
  bids: OrderBookRow[];
  asks: OrderBookRow[];
}

export interface IAggTrade {
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

export interface IDepth {
  /** Event type // depthUpdate */
  e: string;
  /** Event time */
  E: number; // Event time
  /** Transaction time */
  T: number;
  /**Symbol */
  s: string;
  /** First update ID in event */
  U: number;
  /**Final update ID in event */
  u: number;
  /** Final update Id in last stream(ie `u` in last stream) */
  pu: number;
  /**  Bids to be updated [ '0.0024', // Price level to be updated '10', // Quantity]*/
  b: Array<[string, string]>;
  /** Asks to be updated  [ '0.0026', // Price level to be updated '100', // Quantity] */
  a: Array<[string, string]>;
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
    this.wsClient.subscribeAggregateTrades(symbol, MARKET);
    this.wsClient.subscribeDiffBookDepth(symbol, DEPTH_UPDATE_GAP, MARKET);
    this.listenersCnt++;
  }

  public unsubscribe(symbol: string) {
    Logger.warn('unsubscribe not possible');
  }

  public listen(aggTradeCallback, depthCallback) {
    this.wsClient.on('message', (message: any) => {
      try {
        switch (message.e) {
          case 'aggTrade':
            return aggTradeCallback(message);
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
