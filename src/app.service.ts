import { Injectable } from '@nestjs/common';
import { TradesService } from './modules/history/trades/trades.service';
import { DepthService } from './modules/history/depth/depth.service';

@Injectable()
export class AppService {
  constructor(
    private readonly tradesService: TradesService,
    private readonly depthService: DepthService,
  ) {}

  subscribe(symbol: string): void {
    this.tradesService.subscribe(symbol);
    // this.depthService.subscribe(symbol);
  }

  unsubscribe(symbol: string): void {
    this.tradesService.unsubscribe(symbol);
    // this.depthService.unsubscribe(symbol);
  }
}
