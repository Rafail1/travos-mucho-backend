import { Injectable } from '@nestjs/common';
import { SymbolPriceFilter } from 'binance';
import { getExchangeInfo } from 'src/exchange-info';
import { StateService } from 'src/state/state.service';
import { TradesService } from '../history/trades/trades.service';

@Injectable()
export class StarterService {
  constructor(
    private tradesService: TradesService,
    private stateService: StateService,
  ) {}

  async subscribeAll() {
    const exInfo = getExchangeInfo();
    console.log(exInfo.length);
    for (const {
      symbol,
      contractType,
      quoteAsset,
      status,
      filters,
    } of exInfo) {
      if (
        contractType !== 'PERPETUAL' ||
        quoteAsset !== 'USDT' ||
        status !== 'TRADING'
      ) {
        continue;
      }
      const tickSize = (
        filters.find(
          (item: any) => item.filterType === 'PRICE_FILTER',
        ) as SymbolPriceFilter
      )?.tickSize;
      this.stateService.setTickSize(symbol, Number(tickSize));
      await this.tradesService.subscribe(symbol.toLowerCase());
    }

    this.tradesService.listen();
  }

  unsubscribe(symbol: string) {
    return this.tradesService.unsubscribe(symbol);
  }
}
