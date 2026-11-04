import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { SetVisionDto } from './dto/set-vision.dto';
import { LifeService } from './life.service';

@Controller('life')
export class LifeController {
  constructor(private readonly life: LifeService) {}

  @Get('vision')
  getVision(@Req() request: AuthenticatedRequest): Promise<{ vision: string }> {
    return this.life.getVision(request.auth.user.id);
  }

  @Put('vision')
  setVision(@Req() request: AuthenticatedRequest, @Body() body: SetVisionDto): Promise<{ vision: string }> {
    return this.life.setVision(request.auth.user.id, body.vision);
  }
}
