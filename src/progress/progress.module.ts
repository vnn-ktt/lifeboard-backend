import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { LifeRoutine } from '@/routines/entities/life-routine.entity';
import { RoutineCheck } from '@/routines/entities/routine-check.entity';
import { ProgressController } from '@/progress/progress.controller';
import { ProgressService } from '@/progress/progress.service';

@Module({
  imports: [TypeOrmModule.forFeature([LifeGoal, LifeRoutine, RoutineCheck])],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
