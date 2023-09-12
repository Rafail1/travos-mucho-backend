import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { StarterModule } from './modules/starter/starter.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [WebSocketModule, StarterModule, DatabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
