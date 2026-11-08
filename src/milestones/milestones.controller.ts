import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { CreateMilestoneDto } from '@/milestones/dto/create-milestone.dto';
import { UpdateMilestoneDto } from '@/milestones/dto/update-milestone.dto';
import { SetCompletionDto } from '@/goals/dto/set-completion.dto';
import { NonEmptyBodyPipe } from '@/common/pipes/non-empty-body.pipe';
import { MilestonesService, type MilestoneResponseDto } from '@/milestones/milestones.service';

@ApiTags('Milestones') @ApiCookieAuth('lifeboard.sid')
@Controller('goals/:goalId/milestones')
export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  @Get() @ApiOperation({ summary: 'List milestones for owned goal ordered by order, createdAt' })
  list(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string): Promise<MilestoneResponseDto[]> {
    return this.service.list(req.auth.user.id, goalId);
  }

  @Post() @ApiOperation({ summary: 'Create milestone' })
  create(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string,
    @Body() input: CreateMilestoneDto): Promise<MilestoneResponseDto> {
    return this.service.create(req.auth.user.id, goalId, input);
  }

  @Patch(':milestoneId') @ApiOperation({ summary: 'Update milestone' })
  update(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string,
    @Param('milestoneId', new ParseUUIDPipe({ version: '4' })) milestoneId: string,
    @Body(NonEmptyBodyPipe) input: UpdateMilestoneDto): Promise<MilestoneResponseDto> {
    return this.service.update(req.auth.user.id, goalId, milestoneId, input);
  }

  @Put(':milestoneId/completion') @ApiOperation({ summary: 'Set completion idempotently; server timestamp' })
  complete(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string,
    @Param('milestoneId', new ParseUUIDPipe({ version: '4' })) milestoneId: string,
    @Body() input: SetCompletionDto): Promise<MilestoneResponseDto> {
    return this.service.complete(req.auth.user.id, goalId, milestoneId, input.completed);
  }

  @Delete(':milestoneId') @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete milestone; linked tasks remain and are detached' })
  remove(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string,
    @Param('milestoneId', new ParseUUIDPipe({ version: '4' })) milestoneId: string): Promise<void> {
    return this.service.remove(req.auth.user.id, goalId, milestoneId);
  }
}
