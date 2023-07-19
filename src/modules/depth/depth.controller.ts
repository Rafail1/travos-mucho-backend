import { Controller, Get } from '@nestjs/common';
import { DepthService } from './depth.service';

@Controller('depth')
export class DepthController {
  constructor(private readonly depthService: DepthService) {}

  @Get()
  getHello(): string {
    return this.depthService.getHello();
  }
}
