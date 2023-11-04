import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TradesModule } from '../history/trades/trades.module';
import { StarterService } from './starter.service';
import { StateModule } from 'src/state/state.module';

@Module({
  imports: [HttpModule, TradesModule, StateModule],
  providers: [StarterService],
  exports: [StarterService],
})
export class StarterModule {}
