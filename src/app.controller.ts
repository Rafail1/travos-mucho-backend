import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('run')
  run(@Query('symbol') symbol: string) {
    if (!symbol) {
      throw Error('symbol required');
    }
    this.appService.subscribe(symbol.toLowerCase());
  }

  @Get('subscribe-all')
  subscribeAll() {
    this.appService.subscribeAll();
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

  @Get('depth-updates')
  getDepthUpdates(
    @Query('symbol') symbol: string,
    @Query('time') time: string,
  ) {
    return this.appService.getDepthUpdates(symbol, new Date(time));
  }
}
