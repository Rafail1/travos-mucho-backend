import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('depth')
  async getDepth(@Query('symbol') symbol: string, @Query('time') time: string) {
    const name = `depth_${Math.random()}`;
    console.time(name);

    const result = await this.appService.getDepthHistory(
      symbol,
      new Date(time),
    );
    console.timeEnd(name);
    return result;
  }

  // @Get('cluster')
  // async getCluster(
  //   @Query('symbol') symbol: string,
  //   @Query('time') time: string,
  // ) {
  //   const name = `getCluster_${Math.random()}`;
  //   console.time(name);

  //   const result = await this.appService.getCluster(symbol, new Date(time));
  //   console.timeEnd(name);
  //   return result;
  // }
}
