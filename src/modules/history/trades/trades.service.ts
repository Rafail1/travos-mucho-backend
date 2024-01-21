import { Injectable, Logger } from '@nestjs/common';
import { USDMClient } from 'binance';
import { QueryTypes } from 'sequelize';
import { getExchangeInfo } from 'src/exchange-info';
import { DatabaseService } from '../../database/database.service';
import { IDepth, WebSocketService } from '../../websocket/websocket.service';

const FLUSH_INTERVAL = 1000 * 30;
const FLUSH_FULL_INTERVAL = 1000 * 60;
@Injectable()
export class TradesService {
  private listening = false;
  private usdmClient = new USDMClient();

  private subscribedSymbols = new Set();
  private depthBuffer = new Map<string, Array<IDepth>>();

  constructor(
    private databaseService: DatabaseService,
    private webSocketService: WebSocketService,
  ) {
    for (const { symbol } of getExchangeInfo()) {
      this.depthBuffer.set(symbol, []);
    }
  }

  async subscribe(symbol: string) {
    this.subscribedSymbols.add(symbol);
    try {
      await this.webSocketService.subscribe(symbol);
    } catch (e) {
      Logger.error(e?.message);
      return null;
    }
  }

  unsubscribe(symbol: string) {
    this.webSocketService.unsubscribe(symbol);
    this.subscribedSymbols.delete(symbol);
  }

  listen() {
    if (this.listening) {
      return;
    }
    this.listening = true;
    this.webSocketService.listen(this.depthCallback.bind(this));
    this.initSnapshot();
    setInterval(async () => {
      this.flushFullDepth();
    }, FLUSH_FULL_INTERVAL);
  }

  async depthCallback(depth: IDepth) {
    this.depthBuffer.get(depth.s).push(depth);
  }

  async flushFullDepth() {
    for (const symbol of this.depthBuffer.keys()) {
      const _depthBuffer = this.depthBuffer.get(symbol);
      if (!_depthBuffer.length) {
        continue;
      }
      this.flushDepth(_depthBuffer, symbol);
    }
  }

  /**
   *
   * @param buffer splice of buffer (don't need to splice it again)
   */
  private async flushDepth(buffer: IDepth[], symbol: string) {
    try {
      // const snapshots = this.snapshots.get(symbol);
      // const idx = snapshots.findIndex((item) => {
      //   const fits =
      //     buffer[0].u >= item.lastUpdateId && buffer[0].U <= item.lastUpdateId;

      //   return fits || item.E < buffer[0].E;
      // });

      // if (idx > 0) {
      //   snapshots.splice(0, idx);
      // }

      // if (!snapshots.length) {
      //   buffer.splice(0);
      //   return;
      // }

      // let snapshotIndex;
      // for (let i = 0; i < buffer.length; i++) {
      //   snapshotIndex = snapshots.findIndex(
      //     (item) =>
      //       buffer[i].u >= item.lastUpdateId &&
      //       buffer[i].U <= item.lastUpdateId,
      //   );

      //   // if (snapshotIndex >= 0) {
      //   //   buffer.splice(0, i);
      //   //   break;
      //   // }
      // }
      // if (snapshotIndex === -1) {
      //   return;
      // }

      // const snapshot = snapshots[snapshotIndex];

      if (!buffer.length) {
        return;
      }

      const maxTF = this.databaseService.filterTimestamp(
        buffer[buffer.length - 1].E,
        FLUSH_INTERVAL,
      );

      let currentTF =
        this.databaseService.filterTimestamp(buffer[0].E, FLUSH_INTERVAL) +
        FLUSH_INTERVAL;
      let i = 0;

      const rows = { [currentTF]: [] };
      // const depthSnapshots = {
      //   [currentTF]: JSON.parse(JSON.stringify(snapshot)),
      // };

      while (currentTF < maxTF) {
        const depth = buffer[i];
        rows[currentTF].push(depth);
        // this.updateSnapshot(depth.a, snapshot.asks);
        // this.updateSnapshot(depth.b, snapshot.bids);
        i++;
        if (depth.E >= currentTF) {
          currentTF += FLUSH_INTERVAL;
          if (currentTF < maxTF) {
            rows[currentTF] = [];
            // depthSnapshots[currentTF] = JSON.parse(JSON.stringify(snapshot));
          }
        }
      }

      buffer.splice(0, i);
      await this.databaseService.query(
        `INSERT INTO public."DepthUpdates_${symbol}"(
        "E", data)
        VALUES ${Object.entries(rows)
          .map(([tf, data]) => {
            return `(
              '${new Date(Number(tf)).toISOString()}',
              '${JSON.stringify(data)}'
            )`;
          })
          .join(',')} ON CONFLICT DO NOTHING`,
        { type: QueryTypes.INSERT },
      );

      // console.log(buffer.length);
    } catch (e) {
      Logger.error(`flushDepth error ${e?.message}`);
    }
  }

  // private updateSnapshot(items, snapshotItems) {
  //   items.forEach((leftItem) => {
  //     const existsIndex = snapshotItems.findIndex(
  //       (item) => Number(item[0]) === Number(leftItem[0]),
  //     );

  //     if (existsIndex === -1) {
  //       snapshotItems.push(leftItem);
  //     } else {
  //       snapshotItems[existsIndex] = leftItem;
  //     }
  //   });
  // }

  async initSnapshot() {
    const symbols = getExchangeInfo().map((item) => item.symbol);
    let i = 0;
    const _setSnapshot = () => {
      if (i === symbols.length) {
        i = 0;
      }

      const symbol = symbols[i];
      this.usdmClient
        .getOrderBook({
          symbol,
          limit: 500,
        })
        .then((snapshotData) => {
          return this.databaseService.query(
            `INSERT INTO public."OrderBookSnapshot_${symbol}"
            ("lastUpdateId", "E", bids, asks)
            VALUES (
              :lastUpdateId,
              :E,
              :bids,
              :asks
            ) ON CONFLICT DO NOTHING`,
            {
              type: QueryTypes.INSERT,
              replacements: {
                lastUpdateId: snapshotData.lastUpdateId,
                bids: JSON.stringify(snapshotData.bids),
                asks: JSON.stringify(snapshotData.asks),
                E: new Date(snapshotData.E).toISOString(),
              },
            },
          );
        })
        .catch((e) => {
          Logger.error(e?.message);
        })
        .finally(() => {
          i++;
          setTimeout(() => {
            _setSnapshot();
          }, 700);
        });
    };

    _setSnapshot();
  }
}
