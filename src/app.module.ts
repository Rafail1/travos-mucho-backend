import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DepthModule } from './modules/history/depth/depth.module';
import { TradesModule } from './modules/history/trades/trades.module';

@Module({
  imports: [DepthModule, TradesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
