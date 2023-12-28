import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom, interval } from 'rxjs';
import { DatabaseService } from '../database/database.service';
import { Snapshot } from '../websocket/websocket.service';
import { getExchangeInfo } from 'src/exchange-info';

const MESSAGE_QUEUE_INTERVAL = 500;
const DEPTH_LIMIT = 1000;

@Injectable()
export class OrderBookService {
  private proxyUrl = 'https://scalp24.store';
  private messageQueueMap = new Map();

  private orderBookSetting = new Map();
  constructor(
    private databaseService: DatabaseService,
    private httpService: HttpService,
  ) {}

  public init() {
    this.listenQueue();
  }

  async setObToAll() {
    const symbols = getExchangeInfo() || [];
    Logger.debug(`symbols length: ${symbols.length}`);
    for (const { symbol, contractType, quoteAsset, status } of symbols) {
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
              this.orderBookSetting.delete(symbol);

              if (!data) {
                return resolve(null);
              }
              await this.databaseService.orderBookSnapshot.create(data);

              if (!data.bids.length || !data.asks.length) {
                Logger.warn(`symbol ${symbol} have empty borders`);
                return resolve(null);
              }

              const existsBorders = await this.databaseService.borders.findByPk(
                symbol,
              );

              if (existsBorders) {
                await this.databaseService.borders.update(
                  {
                    E: new Date(),
                    min: Number(data.bids[data.bids.length - 1][0]),
                    max: Number(data.asks[data.asks.length - 1][0]),
                  },
                  {
                    where: { s: symbol },
                  },
                );
              } else {
                await this.databaseService.borders.upsert({
                  s: symbol,
                  E: new Date(),
                  min: Number(data.bids[data.bids.length - 1][0]),
                  max: Number(data.asks[data.asks.length - 1][0]),
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
      }
    });
  }

  private listenQueue() {
    const settingOb = new Map();
    interval(MESSAGE_QUEUE_INTERVAL).subscribe(async () => {
      if (!this.messageQueueMap.size) {
        return;
      }

      const {
        value: { symbol, cb },
      } = this.messageQueueMap.values().next();

      if (settingOb.has(symbol)) {
        return;
      }

      settingOb.set(symbol, true);
      this.messageQueueMap.delete(symbol);
      Logger.debug(`getting orderBook for ${symbol}`);
      try {
        const snapshotData = await firstValueFrom(
          this.httpService.get(
            `${this.proxyUrl}/rest/binance/depth.php?symbol=${symbol}&limit=${DEPTH_LIMIT}`,
          ),
        );
        Logger.debug(`snapshot: ${snapshotData.status}`);

        const snapshot = {
          ...snapshotData.data,
          asks: snapshotData.data.asks.map((item) => [
            Number(item[0]),
            Number(item[1]),
          ]),
          bids: snapshotData.data.bids.map((item) => [
            Number(item[0]),
            Number(item[1]),
          ]),
          symbol: symbol.toUpperCase(),
        };

        if (snapshot) {
          const data = new Snapshot(symbol, snapshot).fields;
          cb(data);
        } else {
          cb(null);
        }
      } catch (e) {
        Logger.error(e?.message);
        cb(null, e);
      } finally {
        settingOb.delete(symbol);
      }
    });
  }
}
