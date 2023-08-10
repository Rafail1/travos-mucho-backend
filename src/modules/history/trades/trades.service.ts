import { Injectable, Logger } from '@nestjs/common';
import { client as WebSocketClient } from 'websocket';
import { DatabaseService } from '../../database/database.service';
import {
  AggTrade,
  IAggTrade,
  WebSocketService,
} from '../../websocket/websocket.service';

const BUFFER_LENGTH = 1000;
@Injectable()
export class TradesService {
  constructor(
    private databaseService: DatabaseService,
    private webSocketService: WebSocketService,
  ) {}

  async subscribe(symbol: string) {
    const buffer: Array<any> = [];
    this.webSocketService.subscribe(
      symbol,
      async (aggTrade: IAggTrade) => {
        buffer.push(new AggTrade(aggTrade));
        if (buffer.length > BUFFER_LENGTH) {
          await this.flush(buffer.splice(0));
        }
      },
      (depth) => {
        Logger.log('received depth');
      },
    );
  }

  unsubscribe(symbol: string) {
    this.webSocketService.unsubscribe(symbol);
  }

  /**
   *
   * @param buffer splice of buffer (don't need to splice it again)
   */
  private async flush(buffer: any[]) {
    await this.databaseService.aggTrades.createMany({ data: buffer });

    // save buffer, clear buffer, make snapshot, save snapshot
  }
}
