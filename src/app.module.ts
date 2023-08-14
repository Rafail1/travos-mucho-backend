import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TradesModule } from './modules/history/trades/trades.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [WebSocketModule, TradesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
