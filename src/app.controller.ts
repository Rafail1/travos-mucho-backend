import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { SnapshotWorkerService } from './modules/workers/snapshot/snapshot.worker.service';
import { OrderBookService } from './modules/orderbook/orderbook.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly orderBookService: OrderBookService,
    private readonly snapshotWorkerService: SnapshotWorkerService,
  ) {}

  @Get('subscribe-all')
  async subscribeAll() {
    await this.appService.subscribeAll();
  }

  @Get('subscribe-ob')
  subscribeOb() {
    this.orderBookService.setObToAll();
    this.snapshotWorkerService.initSnapshotFlow();
    this.orderBookService.init();
  }
  @Get('stop')
  stop(@Query('symbol') symbol: string) {
    if (!symbol) {
      throw Error('symbol required');
    }
    this.appService.unsubscribe(symbol.toLowerCase());
  }

  @Get('agg-trades')
  getAggTrades(@Query('symbol') symbol: string, @Query('time') time: string) {
    return this.appService.getAggTradesHistory(symbol, new Date(time));
  }

  @Get('depth')
  getDepth(@Query('symbol') symbol: string, @Query('time') time: string) {
    return this.appService.getDepthHistory(symbol, new Date(time));
  }

  @Get('cluster')
  getCluster(@Query('symbol') symbol: string, @Query('time') time: string) {
    return this.appService.getCluster(symbol, new Date(time));
  }

  @Get('remove-history')
  async removeHistory() {
    const removed = await this.appService.removeHistory();
    return { removed };
  }
}
