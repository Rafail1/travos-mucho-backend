import { Injectable } from '@nestjs/common';
import { USDMClient } from 'binance';
import { TradesService } from '../history/trades/trades.service';

@Injectable()
export class StarterService {
  private usdmClient = new USDMClient({});

  constructor(private tradesService: TradesService) {}

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

      await this.subscribe(symbol.toLowerCase());
    }
    this.tradesService.listen();
  }

  subscribe(symbol: string) {
    return this.tradesService.subscribe(symbol);
  }

  unsubscribe(symbol: string) {
    return this.tradesService.unsubscribe(symbol);
  }
}
