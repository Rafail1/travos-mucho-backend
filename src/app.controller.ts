import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { SnapshotWorkerService } from './modules/workers/snapshot/snapshot.worker.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly snapshotWorkerService: SnapshotWorkerService,
  ) {}

  @Get('run')
  run(@Query('symbol') symbol: string) {
    if (!symbol) {
      throw Error('symbol required');
    }
    this.appService.subscribe(symbol.toLowerCase());
  }

  @Get('subscribe-all')
  async subscribeAll() {
    await this.appService.subscribeAll();
    this.snapshotWorkerService.initSnapshotFlow();
  }

  @Get('init-snapshot-flow')
  async initSnapshotFlow() {
    await this.snapshotWorkerService.initSnapshotFlow();
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
