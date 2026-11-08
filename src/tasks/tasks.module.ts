import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalMilestone } from '@/milestones/entities/goal-milestone.entity';
import { GoalTask } from '@/tasks/entities/goal-task.entity';
import { UserWriteLockModule } from '@/common/user-write-lock/user-write-lock.module';
import { TasksService } from '@/tasks/tasks.service';
import { TasksController, TasksDueController } from '@/tasks/tasks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LifeGoal, GoalMilestone, GoalTask]), UserWriteLockModule],
  providers: [TasksService], controllers: [TasksController, TasksDueController],
})
export class TasksModule {}
