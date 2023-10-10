import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { interval } from 'rxjs';
import {
  client as WebSocketClient,
  connection as WebSocketConnection,
} from 'websocket';
export const DEPTH_UPDATE_GAP = 100;

export class AggTrade {
  public fields: Prisma.AggTradesCreateInput;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor({ e, ...data }: IAggTrade) {
    this.fields = {
      ...data,
      E: new Date(data.E),
      T: new Date(data.T),
    };
  }
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

export class Depth {
  public fields: Prisma.DepthUpdatesCreateInput;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor({ e, ...data }: IDepth) {
    this.fields = {
      ...data,
      E: new Date(data.E),
      T: new Date(data.T),
    };
  }
}

export interface ISnapshot {
  /** Event time */
  E: number; // Event time
  /** Transaction time */
  T: number;
  /** uniq id */
  lastUpdateId: number;
  /** Symbol */
  symbol: string; // symbol
  /**  Bids to be updated [ '0.0024', // Price level to be updated '10', // Quantity]*/
  bids: Array<[string, string]>;
  /** Asks to be updated  [ '0.0026', // Price level to be updated '100', // Quantity] */
  asks: Array<[string, string]>;
}

export class Snapshot {
  public fields: Prisma.OrderBookSnapshotCreateInput;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(data: ISnapshot) {
    this.fields = {
      ...data,
      E: new Date(data.E),
      T: new Date(data.T),
    };
  }
}
const MAX_SUBSCRIBERS = 190;
@Injectable()
export class WebSocketService {
  private connectionsMap = new Map<string, Connection>();
  private connections = new Set<Connection>();

  async getConnection(symbol: string) {
    if (this.connectionsMap.has(symbol)) {
      return this.connectionsMap.get(symbol);
    } else {
      let connectionFound = false;
      for (const connection of this.connections.values()) {
        if (connection.subscribersCount() < MAX_SUBSCRIBERS) {
          connectionFound = true;
          this.connectionsMap.set(symbol, connection);
          return connection;
        }
        Logger.debug(`connection is full ${this.connections.size}`);
      }

      if (!connectionFound) {
        Logger.debug('creating new connection');
        const connection = new Connection();
        await connection.connect();
        this.connections.add(connection);
        this.connectionsMap.set(symbol, connection);
        Logger.debug('connection created');
        return connection;
      }
    }
  }
}

export class Connection {
  private messageQueue = [];
  private subscribed = false;
  private subscribing = false;
  private client: WebSocketClient;
  private connection: WebSocketConnection;
  private wsUrl = 'wss://fstream.binance.com/stream';
  private messageId = 1;
  private subscriptions = new Map<string, (data) => void>();

  subscribersCount() {
    return this.subscriptions.size;
  }

  connect() {
    if (this.subscribing) {
      Logger.warn(`subscription already subscribing`);
      return;
    }

    if (this.subscribed) {
      Logger.warn(`subscription already exists`);
      return;
    }

    this.subscribing = true;

    this.client = new WebSocketClient();

    this.client.on('connectFailed', (error) => {
      Logger.log(`Connect Error: ${error.toString()}`);
      this.subscribed = false;
      this.subscribing = false;
      setTimeout(() => {
        this.connect();
      }, 2000);
    });

    return new Promise<void>((resolve) => {
      this.client.on('connect', async (connection: WebSocketConnection) => {
        this.connection = connection;
        this.listenMessageQueue();
        this.subscribed = true;
        this.subscribing = false;
        Logger.log(`WebSocket Client Connected`);

        const oldSubscriptionSymbols = [...this.subscriptions.keys()]
          .map((item) => item.split('@')[0])
          .filter((item, idx, arr) => arr.indexOf(item) === idx);
        for (const symbol of oldSubscriptionSymbols) {
          const aggTradeCallback = this.subscriptions.get(`${symbol}@aggTrade`);
          const depthCallback = this.subscriptions.get(
            `${symbol}@depth@${DEPTH_UPDATE_GAP}ms`,
          );
          // await this.subscribeAggTrade(symbol, aggTradeCallback);
          await this.subscribeDepth(symbol, depthCallback);
        }
        resolve();
        connection.on('error', (error) => {
          Logger.error(`Connection Error: ${error.toString()}`);
        });

        connection.on('close', () => {
          this.subscribed = false;
          this.subscribing = false;
          Logger.warn(`Connection Closed`);
          setTimeout(() => {
            this.connect();
          }, 2000);
        });

        connection.on('message', (message) => {
          try {
            const { data, stream, id, result } = JSON.parse(message.utf8Data);
            switch (data?.e) {
              case 'aggTrade':
              case 'depthUpdate':
                if (!this.subscriptions.has(stream)) {
                  Logger.warn(`not cancelled subscription stream`);
                  return;
                }
                this.subscriptions.get(stream)(data);
                return;
              case undefined && Number.isInteger(id) && result === null:
                return;
              default:
                Logger.warn(`unknown event ${message.utf8Data}`);
            }
          } catch (e) {
            Logger.debug(message);
            Logger.error(e);
          }
        });

        connection.on('ping', (cancel: () => void, binaryPayload: Buffer) => {
          Logger.log(`Received ping message`);
          connection.pong(binaryPayload);
        });
      });

      this.client.connect(this.wsUrl);
    });
  }

  public subscribe(
    symbol: string,
    aggTradeCallback: (data: IAggTrade) => void,
    depthCallback: (data: IDepth) => void,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.subscriptions.has(`${symbol}@aggTrade`)) {
        Logger.warn(`subscribing twice ${symbol}`);
        return;
      }

      if (!this.connection) {
        Logger.warn(`Connection not ready ${symbol}`);
        return reject('Connection not ready');
      }

      this.subscribeAggTrade(symbol, aggTradeCallback)
        .then(() => this.subscribeDepth(symbol, depthCallback))
        .then(() => {
          Logger.log(`subscribeAggTrade resolve ${symbol}`);
          return resolve();
        })
        .catch((e) => {
          Logger.error(`subscribeAggTrade reject ${e}`);
          return reject(e);
        });
    });
  }

  public unsubscribe(symbol: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.send(
        {
          method: 'UNSUBSCRIBE',
          params: [
            `${symbol}@aggTrade`,
            `${symbol}@depth@${DEPTH_UPDATE_GAP}ms`,
          ],
          id: this.messageId++,
        },
        (err) => {
          if (err) {
            return reject(err);
          }

          this.subscriptions.delete(`${symbol}@aggTrade`);
          this.subscriptions.delete(`${symbol}@depth@${DEPTH_UPDATE_GAP}ms`);
          return resolve();
        },
      );
    });
  }

  private async subscribeAggTrade(symbol, cb) {
    return new Promise<void>((resolve, reject) => {
      this.send(
        {
          method: 'SUBSCRIBE',
          params: [`${symbol}@aggTrade`],
          id: this.messageId++,
        },
        (err) => {
          if (err) {
            Logger.error(`${JSON.stringify(err)} ${symbol}`);
            return reject(err);
          }
          this.subscriptions.set(`${symbol}@aggTrade`, cb);
          Logger.debug(`subscribed to aggTrade ${symbol}`);

          return resolve();
        },
      );
    });
  }

  private async subscribeDepth(symbol, cb) {
    return new Promise<void>((resolve, reject) => {
      this.send(
        {
          method: 'SUBSCRIBE',
          params: [`${symbol}@depth@${DEPTH_UPDATE_GAP}ms`],
          id: this.messageId++,
        },
        (err) => {
          if (err) {
            return reject(err);
          }
          this.subscriptions.set(`${symbol}@depth@${DEPTH_UPDATE_GAP}ms`, cb);
          Logger.debug(`subscribed to depth ${symbol}`);

          return resolve();
        },
      );
    });
  }

  private send(data, cb) {
    this.messageQueue.push({ data, cb });
  }

  private listenMessageQueue() {
    interval(250).subscribe(() => {
      if (this.messageQueue.length) {
        const { data } = this.messageQueue[0];
        console.log(data.id);
      }
      if (this.connection.state !== 'open') {
        console.log(this.connection.state);
      } else if (this.messageQueue.length) {
        const { data, cb } = this.messageQueue.shift();
        this.connection.send(JSON.stringify(data), cb);
      }
    });
  }
}
