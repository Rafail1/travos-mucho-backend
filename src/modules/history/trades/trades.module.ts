import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { WebSocketModule } from 'src/modules/websocket/websocket.module';
import { DatabaseModule } from '../../database/database.module';
import { TradesService } from './trades.service';

@Module({
  imports: [HttpModule, DatabaseModule, WebSocketModule],
  providers: [TradesService],
  exports: [TradesService],
})
export class TradesModule {}
