import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { NonEmptyBodyPipe } from '@/common/pipes/non-empty-body.pipe';
import { ParseDateKeyPipe } from '@/common/pipes/parse-date-key.pipe';
import { CreateRoutineDto } from '@/routines/dto/create-routine.dto';
import { UpdateRoutineDto } from '@/routines/dto/update-routine.dto';
import { SetCheckDto } from '@/routines/dto/set-check.dto';
import { DateQueryDto } from '@/routines/dto/date-query.dto';
import { ChecksRangeQueryDto } from '@/routines/dto/checks-range-query.dto';
import { ListRoutinesQueryDto } from '@/routines/dto/list-routines-query.dto';
import type { RoutineResponseDto, DayRoutinesResponseDto } from '@/routines/dto/routine-response.dto';
import { RoutinesService } from '@/routines/routines.service';

@Controller('routines')
export class RoutinesController {
  constructor(private readonly routines: RoutinesService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: ListRoutinesQueryDto): Promise<RoutineResponseDto[]> {
    return this.routines.list(request.auth.user.id, query.goalId);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateRoutineDto): Promise<RoutineResponseDto> {
    return this.routines.create(request.auth.user.id, body);
  }

  @Get('day')
  day(@Req() request: AuthenticatedRequest, @Query() query: DateQueryDto): Promise<DayRoutinesResponseDto> {
    return this.routines.day(request.auth.user.id, query.date);
  }

  @Get('checks')
  checks(@Req() request: AuthenticatedRequest, @Query() query: ChecksRangeQueryDto): Promise<{ checks: Record<string, true> }> {
    return this.routines.listChecks(request.auth.user.id, query.from, query.to);
  }

  @Get(':id')
  get(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<RoutineResponseDto> {
    return this.routines.get(request.auth.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(NonEmptyBodyPipe) body: UpdateRoutineDto,
  ): Promise<RoutineResponseDto> {
    return this.routines.update(request.auth.user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<void> {
    return this.routines.remove(request.auth.user.id, id);
  }

  @Put(':id/checks/:date')
  setDone(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('date', ParseDateKeyPipe) date: string,
    @Body() body: SetCheckDto,
  ): Promise<{ routineId: string; date: string; done: boolean }> {
    return this.routines.setDone(request.auth.user.id, id, date, body.done);
  }
}
