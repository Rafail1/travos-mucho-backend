import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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
}
