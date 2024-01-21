import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom, interval } from 'rxjs';
import { QueryTypes } from 'sequelize';
import { getExchangeInfo } from 'src/exchange-info';
import { DatabaseService } from '../database/database.service';
import { Borders } from '../database/sequelize/models/borders';

const MESSAGE_QUEUE_INTERVAL = 500;
const DEPTH_LIMIT = 1000;

@Injectable()
export class OrderBookService {
  private proxyUrl = 'https://fapi.binance.com/fapi/v1';
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
      try {
        await this.setOB(symbol);
      } catch (e) {
        Logger.error(e?.message);
      }
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

              await this.databaseService.query(
                `INSERT INTO public."OrderBookSnapshot_${symbol}"
                ("lastUpdateId", "E", bids, asks)
                VALUES (
                  :lastUpdateId,
                  :E,
                  :bids,
                  :asks
                ) ON CONFLICT DO NOTHING;`,
                {
                  type: QueryTypes.INSERT,
                  replacements: {
                    lastUpdateId: data.lastUpdateId,
                    bids: JSON.stringify(data.bids),
                    asks: JSON.stringify(data.asks),
                    E: data.E.toISOString(),
                  },
                },
              );

              if (!data.bids.length || !data.asks.length) {
                Logger.warn(`symbol ${symbol} have empty borders`);
                return resolve(null);
              }

              const existsBorders = await Borders.findByPk(symbol);

              if (existsBorders) {
                await Borders.update(
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
                await Borders.upsert({
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
              Logger.error(e?.message);
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
            `${this.proxyUrl}/depth?symbol=${symbol}&limit=${DEPTH_LIMIT}`,
          ),
        );
        cb({
          ...snapshotData.data,
          symbol: symbol.toUpperCase(),
        });
      } catch (e) {
        Logger.error(e?.message);
        cb(null, e);
      } finally {
        settingOb.delete(symbol);
      }
    });
  }
}
