import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { CreateAreaDto } from './dto/create-area.dto';
import type { AreaResponseDto } from './dto/area-response.dto';
import { AreasService } from './areas.service';

@Controller('areas')
export class AreasController {
  constructor(private readonly areas: AreasService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<AreaResponseDto[]> {
    return this.areas.list(request.auth.user.id);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateAreaDto): Promise<AreaResponseDto> {
    return this.areas.create(request.auth.user.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string): Promise<void> {
    return this.areas.remove(request.auth.user.id, id);
  }
}
