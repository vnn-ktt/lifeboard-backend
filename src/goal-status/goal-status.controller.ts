import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { UpdateGoalStatusDto } from '@/goal-status/dto/update-goal-status.dto';
import { StatusEventsQueryDto } from '@/goal-status/dto/status-events-query.dto';
import { GoalStatusService, type GoalStatusEventResponse } from '@/goal-status/goal-status.service';
import type { GoalResponseDto } from '@/goals/dto/goal-response.dto';

@ApiTags('Goal statuses')
@ApiCookieAuth('lifeboard.sid')
@Controller('goals/:goalId')
export class GoalStatusController {
  constructor(private readonly service: GoalStatusService) {}

  @Patch('status') @ApiOperation({ summary: 'Change goal status atomically; same-state requests are idempotent' })
  change(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string,
    @Body() dto: UpdateGoalStatusDto): Promise<GoalResponseDto> {
    return this.service.change(req.auth.user.id, goalId, dto.status);
  }

  @Get('status-events') @ApiOperation({ summary: 'Real status transitions newest first; pagination cursor in X-Next-Cursor' })
  async history(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string,
    @Query() query: StatusEventsQueryDto, @Res({ passthrough: true }) res: Response): Promise<GoalStatusEventResponse[]> {
    const result = await this.service.history(req.auth.user.id, goalId, query.cursor, query.limit);
    if (result.nextCursor) res.setHeader('X-Next-Cursor', result.nextCursor);
    return result.items;
  }
}
