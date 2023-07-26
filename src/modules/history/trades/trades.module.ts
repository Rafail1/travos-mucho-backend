import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { TradesService } from './trades.service';

@Module({
  imports: [HttpModule, DatabaseModule],
  providers: [TradesService],
})
export class TradesModule {}
