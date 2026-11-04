import { Controller, Get, Param, ParseUUIDPipe, Query, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { DateQueryDto } from '@/routines/dto/date-query.dto';
import { AtQueryDto } from '@/progress/dto/at-query.dto';
import type { GoalProgressResponseDto } from '@/progress/dto/goal-progress-response.dto';
import { weeklyPlanStats } from '@/progress/domain/progress-rules';
import { ProgressService } from '@/progress/progress.service';

@Controller()
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('goals/:id/progress')
  goal(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: AtQueryDto,
  ): Promise<GoalProgressResponseDto> {
    return this.progress.goal(request.auth.user.id, id, query.at);
  }

  @Get('progress/week')
  week(@Req() request: AuthenticatedRequest, @Query() query: DateQueryDto): Promise<ReturnType<typeof weeklyPlanStats>> {
    return this.progress.week(request.auth.user.id, query.date);
  }
}
