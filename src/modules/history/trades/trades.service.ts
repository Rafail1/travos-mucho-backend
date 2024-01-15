import { Injectable, Logger } from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { DatabaseService } from '../../database/database.service';
import { IDepth, WebSocketService } from '../../websocket/websocket.service';
import { getExchangeInfo } from 'src/exchange-info';

const FLUSH_INTERVAL = 1000 * 30;
const FLUSH_FULL_INTERVAL = 1000 * 60;
@Injectable()
export class TradesService {
  private listening = false;
  private subscribedSymbols = new Set();
  private depthBuffer = new Map<string, Array<IDepth>>();

  constructor(
    private databaseService: DatabaseService,
    private webSocketService: WebSocketService,
  ) {
    for (const { symbol } of getExchangeInfo()) {
      this.depthBuffer.set(symbol, []);
    }

    setInterval(async () => {
      this.flushFullDepth();
    }, FLUSH_FULL_INTERVAL);
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
  }

  depthCallback(depth: IDepth) {
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
      const maxTF = this.databaseService.filterTimestamp(
        buffer[buffer.length - 1].E,
        FLUSH_INTERVAL,
      );

      let currentTF =
        this.databaseService.filterTimestamp(buffer[0].E, FLUSH_INTERVAL) +
        FLUSH_INTERVAL;
      let i = 0;
      const rows = { [currentTF]: [] };
      while (currentTF < maxTF) {
        const depth = buffer[i];
        rows[currentTF].push(depth);
        i++;
        if (depth.E >= currentTF) {
          currentTF += FLUSH_INTERVAL;
          if (currentTF < maxTF) {
            rows[currentTF] = [];
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
          .join(',')}`,
        { type: QueryTypes.INSERT },
      );
      console.log(buffer.length);
    } catch (e) {
      Logger.error(`flushDepth error ${e?.message}`);
    }
  }
}
