import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TradesModule } from '../history/trades/trades.module';
import { StarterService } from './starter.service';

@Module({
  imports: [HttpModule, TradesModule],
  providers: [StarterService],
  exports: [StarterService],
})
export class StarterModule {}
