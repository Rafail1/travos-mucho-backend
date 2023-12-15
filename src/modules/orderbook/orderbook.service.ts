import { Injectable, Logger } from '@nestjs/common';
import { USDMClient } from 'binance';
import { DatabaseService } from '../database/database.service';
import { interval } from 'rxjs';
import { Snapshot } from '../websocket/websocket.service';
import { Prisma } from '@prisma/client';

const MESSAGE_QUEUE_INTERVAL = 500;
const DEPTH_LIMIT = 1000;
const PARTIAL_DEPTH_LIMIT = 100;
const SHARED_QUEUE_INTERVAL = 5000;

@Injectable()
export class OrderBookService {
  private usdmClient = new USDMClient({});
  private messageQueueMap = new Map();
  private partialQueueMap = new Map();

  private orderBookSetting = new Map();
  private partialOrderBookSetting = new Map();
  constructor(private databaseService: DatabaseService) {}

  public init() {
    this.listenQueue();
    this.listenSharedActions();
    this.listenPartialQueue();
  }

  async setObToAll() {
    const exInfo = await this.usdmClient.getExchangeInfo();
    for (const { symbol, contractType, quoteAsset, status } of exInfo.symbols) {
      if (
        contractType !== 'PERPETUAL' ||
        quoteAsset !== 'USDT' ||
        status !== 'TRADING'
      ) {
        continue;
      }
      await this.setOB(symbol);
    }
  }

  setPartialOB(symbol: string, setPartialOBCb: () => Promise<void>) {
    if (this.partialOrderBookSetting.has(symbol)) {
      return;
    }
    this.partialOrderBookSetting[symbol] = true;

    const obj = {
      symbol,
      cb: async (data: Prisma.OrderBookSnapshotCreateInput) => {
        this.partialOrderBookSetting.delete(symbol);
        await this.databaseService.partialSnapshot
          .create({
            data: {
              E: data.E,
              s: data.symbol,
              asks: data.asks,
              bids: data.bids,
            },
          })
          .catch((e) => {
            Logger.error(e?.message);
          });

        if (setPartialOBCb) {
          setPartialOBCb.call(this);
        }
      },
    };
    this.partialQueueMap.set(obj.symbol, obj);
  }

  setOB(symbol: string, setObCallback?: () => Promise<void>) {
    return new Promise((resolve, reject) => {
      try {
        if (this.orderBookSetting.has(symbol)) {
          return resolve(`orderBookSetting exists ${symbol}`);
        }

        this.orderBookSetting[symbol] = true;
        const obj = {
          symbol,
          cb: async (data) => {
            try {
              await this.databaseService.orderBookSnapshot.create({
                data,
              });

              if (!data.bids.length || !data.asks.length) {
                Logger.warn(`symbol ${symbol} have empty borders`);
                return;
              }

              const existsBorders =
                await this.databaseService.borders.findUnique({
                  where: { s: symbol },
                });

              if (existsBorders) {
                await this.databaseService.borders.update({
                  where: { s: symbol },
                  data: {
                    E: new Date(),
                    min: Number(data.bids[data.bids.length - 1][0]),
                    max: Number(data.asks[data.asks.length - 1][0]),
                  },
                });
              } else {
                await this.databaseService.borders.create({
                  data: {
                    s: symbol,
                    E: new Date(),
                    min: Number(data.bids[data.bids.length - 1][0]),
                    max: Number(data.asks[data.asks.length - 1][0]),
                  },
                });
              }

              if (setObCallback) {
                setObCallback.call(this);
              }
              resolve(null);
            } catch (e) {
              resolve(e);
            }
          },
        };
        this.messageQueueMap.set(obj.symbol, obj);
      } catch (e) {
        Logger.error(`setOrderBook error ${symbol}, ${e?.message}`);
        reject(e);
      } finally {
        this.orderBookSetting.delete(symbol);
      }
    });
  }

  private listenQueue() {
    interval(MESSAGE_QUEUE_INTERVAL).subscribe(async () => {
      if (this.messageQueueMap.size) {
        const {
          value: { symbol, cb },
        } = this.messageQueueMap.values().next();
        this.messageQueueMap.delete(symbol);
        Logger.debug(`getting orderBook for ${symbol}`);
        const snapshot = await this.usdmClient
          .getOrderBook({ symbol, limit: DEPTH_LIMIT })
          .then((data) => ({
            ...data,
            asks: data.asks.map((item) => [Number(item[0]), Number(item[1])]),
            bids: data.bids.map((item) => [Number(item[0]), Number(item[1])]),
            symbol: symbol.toUpperCase(),
          }))
          .catch((e) => {
            Logger.error(e?.message);
          });
        if (snapshot) {
          const data = new Snapshot(symbol, snapshot).fields;
          cb(data).catch(() => {
            return;
          });
        }
      }
    });
  }

  public listenPartialQueue() {
    interval(MESSAGE_QUEUE_INTERVAL).subscribe(async () => {
      if (this.partialQueueMap.size) {
        const {
          value: { symbol, cb },
        } = this.partialQueueMap.values().next();
        this.partialQueueMap.delete(symbol);
        Logger.debug(`getting partial orderBook for ${symbol}`);
        const snapshot = await this.usdmClient
          .getOrderBook({ symbol, limit: PARTIAL_DEPTH_LIMIT })
          .then((data) => ({
            ...data,
            asks: data.asks.map((item) => [Number(item[0]), Number(item[1])]),
            bids: data.bids.map((item) => [Number(item[0]), Number(item[1])]),
            symbol: symbol.toUpperCase(),
          }))
          .catch((e) => {
            Logger.error(e?.message);
          });
        if (snapshot) {
          const data = new Snapshot(symbol, snapshot).fields;
          cb(data).catch(() => {
            return;
          });
        }
      }
    });
  }

  public listenSharedActions() {
    interval(SHARED_QUEUE_INTERVAL).subscribe(async () => {
      const actions = await this.databaseService.sharedAction.findMany({
        where: { inProgress: false },
        orderBy: [{ E: 'desc' }],
      });

      for (const action of actions) {
        await this.databaseService.sharedAction.update({
          where: { symbol: action.symbol },
          data: { inProgress: true },
        });
        if (action.reason === 'sequence broken') {
          this.setPartialOB(action.symbol, async () => {
            await this.databaseService.sharedAction.delete({
              where: { symbol: action.symbol },
            });
          });
        } else {
          this.setOB(action.symbol, async () => {
            await this.databaseService.sharedAction.delete({
              where: { symbol: action.symbol },
            });
          });
        }
      }
    });
  }
}
