import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('agg-trades')
  async getAggTrades(
    @Query('symbol') symbol: string,
    @Query('time') time: string,
  ) {
    console.time('getAggTrades');
    const result = await this.appService.getAggTradesHistory(
      symbol,
      new Date(time),
    );
    console.timeEnd('getAggTrades');
    return result;
  }

  @Get('depth')
  async getDepth(@Query('symbol') symbol: string, @Query('time') time: string) {
    console.time('depth');

    const result = await this.appService.getDepthHistory(
      symbol,
      new Date(time),
    );
    console.timeEnd('depth');
    return result;
  }

  @Get('cluster')
  async getCluster(
    @Query('symbol') symbol: string,
    @Query('time') time: string,
  ) {
    console.time('depth');

    const result = await this.appService.getCluster(symbol, new Date(time));
    console.timeEnd('depth');
    return result;
  }
}
