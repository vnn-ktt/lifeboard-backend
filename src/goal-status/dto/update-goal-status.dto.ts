import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GOAL_STATUSES, type GoalStatus } from '@/goal-status/domain/goal-status';

export class UpdateGoalStatusDto {
  @ApiProperty({ enum: [...GOAL_STATUSES] })
  @IsIn(GOAL_STATUSES)
  status!: GoalStatus;
}
