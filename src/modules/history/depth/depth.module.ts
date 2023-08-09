import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DepthService } from './depth.service';

@Module({
  imports: [HttpModule, DatabaseModule],
  providers: [DepthService],
  exports: [DepthService],
})
export class DepthModule {}
