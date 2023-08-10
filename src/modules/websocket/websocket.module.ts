import { Module } from '@nestjs/common';
import { WebSocketService } from './websocket.service';

@Module({
  exports: [WebSocketService],
  providers: [WebSocketService],
})
export class WebSocketModule {}
