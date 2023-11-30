import { Injectable, Logger } from '@nestjs/common';
import { USDMClient } from 'binance';
import { DatabaseService } from '../database/database.service';
import { interval } from 'rxjs';
import { Snapshot } from '../websocket/websocket.service';

const MESSAGE_QUEUE_INTERVAL = 1000;
const DEPTH_LIMIT = 1000;
const SHARED_QUEUE_INTERVAL = 5000;

@Injectable()
export class OrderBookService {
  private usdmClient = new USDMClient({});
  private messageQueue = [];

  private orderBookSetting = new Map();
  constructor(private databaseService: DatabaseService) {
    this.listenQueue();
  }

  async subscribeAll() {
    const exInfo = await this.usdmClient.getExchangeInfo();
    for (const { symbol, contractType, quoteAsset, status } of exInfo.symbols) {
      if (
        contractType !== 'PERPETUAL' ||
        quoteAsset !== 'USDT' ||
        status !== 'TRADING'
      ) {
        continue;
      }
      this.setOB(symbol);
    }
  }

  setOB(symbol: string, setObCallback?: any) {
    try {
      if (this.orderBookSetting.has(symbol)) {
        return;
      }

      this.orderBookSetting[symbol] = true;
      const obj = {
        symbol,
        cb: async (data) => {
          await this.databaseService.orderBookSnapshot.create({
            data,
          });

          if (!data.bids.length || !data.asks.length) {
            Logger.warn(`symbol ${symbol} have empty borders`);
            return;
          }

          await this.databaseService.borders.create({
            data: {
              s: symbol,
              E: new Date(),
              min: Number(data.bids[data.bids.length - 1][0]),
              max: Number(data.asks[data.asks.length - 1][0]),
            },
          });

          if (setObCallback) {
            setObCallback.call();
          }
        },
      };
      this.messageQueue.push(obj);
    } catch (e) {
      Logger.error(`setOrderBook error ${symbol}, ${e?.message}`);
    } finally {
      this.orderBookSetting.delete(symbol);
    }
  }

  private listenQueue() {
    interval(MESSAGE_QUEUE_INTERVAL).subscribe(async () => {
      if (this.messageQueue.length) {
        const { symbol, cb } = this.messageQueue.shift();
        Logger.debug(`getting orderBook for ${symbol}`);
        const snapshot = await this.usdmClient
          .getOrderBook({ symbol, limit: DEPTH_LIMIT })
          .then((data) => ({ ...data, symbol: symbol.toUpperCase() }))
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

  public listenSharedActions(symbol: string) {
    interval(SHARED_QUEUE_INTERVAL).subscribe(async () => {
      const actions = await this.databaseService.sharedAction.findMany({
        where: { inProgress: false },
        orderBy: [{ E: 'desc' }],
      });

      for (const action of actions) {
        await this.databaseService.sharedAction.update({
          where: { symbol },
          data: { inProgress: true },
        });
        this.setOB(action.symbol, () => {
          await this.databaseService.sharedAction.delete({
            where: { symbol },
          });
        });
      }
    });
  }
}
