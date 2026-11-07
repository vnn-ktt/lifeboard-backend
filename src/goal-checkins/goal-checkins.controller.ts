import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { CompleteCheckinDto } from '@/goal-checkins/dto/complete-checkin.dto';
import { GoalCheckinsService } from '@/goal-checkins/goal-checkins.service';

@ApiTags('Goal check-ins') @ApiCookieAuth('lifeboard.sid')
@Controller()
export class GoalCheckinsController {
  constructor(private readonly service: GoalCheckinsService) {}

  @Get('goal-checkins/due') @ApiOperation({ summary: 'Pending check-ins, earliest first, in account timezone' })
  @ApiOkResponse({ description: 'One earliest pending date per unfinished measured goal', schema: {
    type: 'array', items: { type: 'object',
      required: ['goalId', 'dueDate', 'overdue', 'pendingCount', 'outcome'],
      properties: {
        goalId: { type: 'string', format: 'uuid' },
        dueDate: { type: 'string', format: 'date' }, overdue: { type: 'boolean' },
        pendingCount: { type: 'integer', minimum: 0 },
        outcome: { type: 'object', required: ['type', 'percent', 'completed', 'currentValue'],
          properties: { type: { type: 'string', enum: ['numeric', 'binary'] }, percent: { type: 'number' },
            completed: { type: 'boolean' }, currentValue: { type: 'number', nullable: true },
            startValue: { type: 'number' }, targetValue: { type: 'number' }, unit: { type: 'string' },
            direction: { type: 'string', enum: ['increase', 'decrease'] },
          } },
      } },
  } })
  due(@Req() request: AuthenticatedRequest) { return this.service.due(request.auth.user.id); }

  @Get('goals/:goalId/checkins') @ApiOperation({ summary: 'Completed check-in history for a goal' })
  @ApiOkResponse({ description: 'Completed checks ordered by dueDate descending', schema: {
    type: 'array', items: { type: 'object',
      required: ['id', 'goalId', 'dueDate', 'completedAt', 'status'],
      properties: { id: { type: 'string', format: 'uuid' }, goalId: { type: 'string', format: 'uuid' },
        dueDate: { type: 'string', format: 'date' }, completedAt: { type: 'string', format: 'date-time' },
        status: { type: 'string', enum: ['updated', 'unchanged', 'skipped'] },
        metricEntryId: { type: 'string', format: 'uuid' } },
    },
  } })
  history(@Req() request: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string) {
    return this.service.history(request.auth.user.id, goalId);
  }

  @Post('goals/:goalId/checkins') @ApiOperation({ summary: 'Complete earliest pending check-in; atomic with measurement' })
  @ApiCreatedResponse({ description: 'Completed check-in; identical retries return the existing entry' })
  complete(@Req() request: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string,
    @Body() body: CompleteCheckinDto) {
    return this.service.complete(request.auth.user.id, goalId, body);
  }
}
