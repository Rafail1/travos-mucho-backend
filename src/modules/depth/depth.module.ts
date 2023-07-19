import { Module } from '@nestjs/common';
import { DepthService } from './depth.service';
import { DepthController } from './depth.controller';

@Module({
  imports: [],
  controllers: [DepthController],
  providers: [DepthService],
})
export class DepthModule {}
