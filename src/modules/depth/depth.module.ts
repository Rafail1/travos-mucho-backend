import { Module } from '@nestjs/common';
import { DepthService } from './depth.service';
import { DepthController } from './depth.controller';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [DepthController],
  providers: [DepthService],
})
export class DepthModule {}
