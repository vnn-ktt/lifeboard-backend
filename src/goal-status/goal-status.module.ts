import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalStatusEvent } from '@/goal-status/entities/goal-status-event.entity';
import { UserWriteLockModule } from '@/common/user-write-lock/user-write-lock.module';
import { GoalStatusController } from '@/goal-status/goal-status.controller';
import { GoalStatusService } from '@/goal-status/goal-status.service';

@Module({
  imports: [TypeOrmModule.forFeature([LifeGoal, GoalStatusEvent]), UserWriteLockModule],
  providers: [GoalStatusService], controllers: [GoalStatusController],
})
export class GoalStatusModule {}
