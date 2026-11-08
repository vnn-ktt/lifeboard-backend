import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalMilestone } from '@/milestones/entities/goal-milestone.entity';
import { UserWriteLockModule } from '@/common/user-write-lock/user-write-lock.module';
import { MilestonesService } from '@/milestones/milestones.service';
import { MilestonesController } from '@/milestones/milestones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LifeGoal, GoalMilestone]), UserWriteLockModule],
  providers: [MilestonesService], controllers: [MilestonesController],
})
export class MilestonesModule {}
