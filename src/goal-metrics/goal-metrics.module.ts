import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserWriteLockModule } from '@/common/user-write-lock/user-write-lock.module';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalMetricEntry } from '@/goal-metrics/entities/goal-metric-entry.entity';
import { GoalMetricsController } from '@/goal-metrics/goal-metrics.controller';
import { GoalMetricsService } from '@/goal-metrics/goal-metrics.service';

@Module({
  imports: [TypeOrmModule.forFeature([LifeGoal, GoalMetricEntry]), UserWriteLockModule],
  controllers: [GoalMetricsController], providers: [GoalMetricsService], exports: [GoalMetricsService],
})
export class GoalMetricsModule {}
