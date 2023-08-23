import { Injectable } from '@nestjs/common';
import { StarterService } from './modules/starter/starter.service';

@Injectable()
export class AppService {
  constructor(private readonly starterService: StarterService) {}

  subscribe(symbol: string): void {
    this.starterService.subscribe(symbol);
  }

  unsubscribe(symbol: string): void {
    this.starterService.unsubscribe(symbol);
  }

  subscribeAll() {
    this.starterService.subscribeAll();
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
      await this.starterService.subscribe(symbol);
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 200);
      });
    }
  }
}
