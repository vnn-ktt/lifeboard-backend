import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { User } from '@/users/entities/user.entity';
import { GoalMetricEntry } from '@/goal-metrics/entities/goal-metric-entry.entity';
import { GoalCheckin } from '@/goal-checkins/entities/goal-checkin.entity';
import { UserWriteLockModule } from '@/common/user-write-lock/user-write-lock.module';
import { GoalCheckinsController } from '@/goal-checkins/goal-checkins.controller';
import { GoalCheckinsService } from '@/goal-checkins/goal-checkins.service';
import { CheckinScheduleService } from '@/goal-checkins/domain/checkin-schedule.service';

@Module({
  imports: [TypeOrmModule.forFeature([LifeGoal, User, GoalMetricEntry, GoalCheckin]), UserWriteLockModule],
  controllers: [GoalCheckinsController],
  providers: [GoalCheckinsService, CheckinScheduleService],
})
export class GoalCheckinsModule {}
