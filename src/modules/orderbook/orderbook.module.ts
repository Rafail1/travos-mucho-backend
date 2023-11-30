import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { OrderBookService } from './orderbook.service';

@Module({
  imports: [HttpModule, DatabaseModule, WebSocketModule],
  providers: [OrderBookService],
  exports: [OrderBookService],
})
export class OrderBookModule {}
