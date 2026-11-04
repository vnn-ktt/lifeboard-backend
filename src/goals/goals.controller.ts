import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { NonEmptyBodyPipe } from '@/common/pipes/non-empty-body.pipe';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { SetFocusDto } from './dto/set-focus.dto';
import type { GoalResponseDto } from './dto/goal-response.dto';
import { GoalsService } from './goals.service';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<GoalResponseDto[]> {
    return this.goals.list(request.auth.user.id);
  }

  @Get('focus')
  focus(@Req() request: AuthenticatedRequest): Promise<{ goalIds: string[] }> {
    return this.goals.focus(request.auth.user.id);
  }

  @Put('focus')
  setFocus(@Req() request: AuthenticatedRequest, @Body() body: SetFocusDto): Promise<{ goalIds: string[] }> {
    return this.goals.setFocus(request.auth.user.id, body.goalIds);
  }

  @Get(':id')
  get(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<GoalResponseDto> {
    return this.goals.get(request.auth.user.id, id);
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateGoalDto): Promise<GoalResponseDto> {
    return this.goals.create(request.auth.user.id, body);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(NonEmptyBodyPipe) body: UpdateGoalDto,
  ): Promise<GoalResponseDto> {
    return this.goals.update(request.auth.user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() request: AuthenticatedRequest, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<void> {
    return this.goals.remove(request.auth.user.id, id);
  }
}
