import { Injectable } from '@nestjs/common';
import { TradesService } from './modules/history/trades/trades.service';

@Injectable()
export class AppService {
  constructor(private readonly tradesService: TradesService) {}

  subscribe(symbol: string): void {
    this.tradesService.subscribe(symbol);
  }

  unsubscribe(symbol: string): void {
    this.tradesService.unsubscribe(symbol);
  }

  async test() {
    for (const symbol of [
      'ethusdt',
      'btcusdt',
      'bnbusdt',
      'xrpusdt',
      'dogeusdt',
      'adausdt',
      'solusdt',
      'trxusdt',
      'maticusdt',
      '1000shibusdt',
    ]) {
      await this.tradesService.subscribe(symbol);
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 200);
      });
    }
  }
}
