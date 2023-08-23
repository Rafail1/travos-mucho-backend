import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { TradesService } from '../history/trades/trades.service';

@Injectable()
export class StarterService {
  private httpExchangeInfoUrl = 'https://fapi.binance.com/fapi/v1/exchangeInfo';

  constructor(
    private httpService: HttpService,
    private tradesService: TradesService,
  ) {}

  async subscribeAll() {
    const exInfo = await firstValueFrom(
      this.httpService.get(this.httpExchangeInfoUrl),
    ).then(({ data }) => data);
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
  }

  subscribe(symbol: string) {
    return this.tradesService.subscribe(symbol);
  }

  unsubscribe(symbol: string) {
    return this.tradesService.unsubscribe(symbol);
  }
}
