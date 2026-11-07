import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { CreateMetricEntryDto } from '@/goal-metrics/dto/create-metric-entry.dto';
import { GoalMetricsService } from '@/goal-metrics/goal-metrics.service';

@ApiTags('Goal metrics') @ApiCookieAuth('lifeboard.sid')
@Controller('goals/:goalId/metrics')
export class GoalMetricsController {
  constructor(private readonly metrics: GoalMetricsService) {}

  @Get() @ApiOperation({ summary: 'List dated result measurements for a goal' })
  list(@Req() req: AuthenticatedRequest, @Param('goalId', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.metrics.list(req.auth.user.id, id);
  }

  @Post() @ApiOperation({ summary: 'Add manual result measurement' })
  create(@Req() req: AuthenticatedRequest, @Param('goalId', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: CreateMetricEntryDto) {
    return this.metrics.create(req.auth.user.id, id, input);
  }

  @Delete(':entryId') @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a measurement; linked completed check-in survives' })
  remove(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string,
    @Param('entryId', new ParseUUIDPipe({ version: '4' })) entryId: string): Promise<void> {
    return this.metrics.remove(req.auth.user.id, goalId, entryId);
  }
}
