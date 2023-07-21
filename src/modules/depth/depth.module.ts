import { Module } from '@nestjs/common';
import { DepthService } from './depth.service';
import { DepthController } from './depth.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [DepthController],
  providers: [DepthService],
})
export class DepthModule {}
