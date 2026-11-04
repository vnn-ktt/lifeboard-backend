import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserWriteLockModule } from '@/common/user-write-lock/user-write-lock.module';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { LifeRoutine } from '@/routines/entities/life-routine.entity';
import { RoutineCheck } from '@/routines/entities/routine-check.entity';
import { RoutinesController } from '@/routines/routines.controller';
import { RoutinesService } from '@/routines/routines.service';

@Module({
  imports: [TypeOrmModule.forFeature([LifeGoal, LifeRoutine, RoutineCheck]), UserWriteLockModule],
  controllers: [RoutinesController],
  providers: [RoutinesService],
})
export class RoutinesModule {}
