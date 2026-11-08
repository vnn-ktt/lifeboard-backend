import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { CreateTaskDto } from '@/tasks/dto/create-task.dto';
import { UpdateTaskDto } from '@/tasks/dto/update-task.dto';
import { TaskDateQueryDto } from '@/tasks/dto/date-query.dto';
import { SetCompletionDto } from '@/goals/dto/set-completion.dto';
import { NonEmptyBodyPipe } from '@/common/pipes/non-empty-body.pipe';
import { TasksService, type TaskResponseDto } from '@/tasks/tasks.service';

@ApiTags('Tasks') @ApiCookieAuth('lifeboard.sid')
@Controller('goals/:goalId/tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get() @ApiOperation({ summary: 'List tasks of an owned goal' })
  list(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string): Promise<TaskResponseDto[]> {
    return this.service.list(req.auth.user.id, goalId);
  }

  @Post() @ApiOperation({ summary: 'Create one-time task, optionally linked to a milestone of same goal' })
  create(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string,
    @Body() dto: CreateTaskDto): Promise<TaskResponseDto> {
    return this.service.create(req.auth.user.id, goalId, dto);
  }

  @Patch(':taskId') @ApiOperation({ summary: 'Update one-time task' })
  update(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    @Body(NonEmptyBodyPipe) dto: UpdateTaskDto): Promise<TaskResponseDto> {
    return this.service.update(req.auth.user.id, goalId, taskId, dto);
  }

  @Put(':taskId/completion') @ApiOperation({ summary: 'Set task completion idempotently with server timestamp' })
  complete(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string,
    @Body() dto: SetCompletionDto): Promise<TaskResponseDto> {
    return this.service.complete(req.auth.user.id, goalId, taskId, dto.completed);
  }

  @Delete(':taskId') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ summary: 'Delete task' })
  remove(@Req() req: AuthenticatedRequest,
    @Param('goalId', new ParseUUIDPipe({ version: '4' })) goalId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '4' })) taskId: string): Promise<void> {
    return this.service.remove(req.auth.user.id, goalId, taskId);
  }
}

@ApiTags('Tasks') @ApiCookieAuth('lifeboard.sid')
@Controller('tasks')
export class TasksDueController {
  constructor(private readonly service: TasksService) {}

  @Get('due') @ApiOperation({ summary: 'Active goals: open tasks due on/before date, plus open unscheduled tasks' })
  due(@Req() req: AuthenticatedRequest, @Query() query: TaskDateQueryDto): Promise<TaskResponseDto[]> {
    return this.service.due(req.auth.user.id, query.date);
  }
}
