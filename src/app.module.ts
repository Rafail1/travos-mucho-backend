import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DepthModule } from './modules/depth/depth.module';

@Module({
  imports: [DepthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
