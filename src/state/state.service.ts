import { Injectable } from '@nestjs/common';
import { getExchangeInfo } from 'src/exchange-info';

@Injectable()
export class StateService {
  private tickSizes = new Map<string, number>();
  public setTickSize(key: string, value: number) {
    this.tickSizes.set(key, value);
  }

  public getTickSize(key: string) {
    if (!this.tickSizes.has(key)) {
      const exInfo = getExchangeInfo();
      const s = exInfo.find((item) => item.symbol === key);
      if (!s) {
        return;
      }

      const { symbol, contractType, quoteAsset, status, filters } = s;
      if (
        contractType !== 'PERPETUAL' ||
        quoteAsset !== 'USDT' ||
        status !== 'TRADING'
      ) {
        return;
      }
      const tickSize = filters.find(
        (item: any) => item.filterType === 'PRICE_FILTER',
      )?.tickSize;
      this.setTickSize(symbol, Number(tickSize));
    }

    return this.tickSizes.get(key);
  }
}
