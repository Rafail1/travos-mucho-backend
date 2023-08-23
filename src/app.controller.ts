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

  @Get('test')
  test() {
    this.appService.test();
  }
}
