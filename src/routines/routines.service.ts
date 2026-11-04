import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, type EntityManager } from 'typeorm';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { isoWeekday } from '@/utils/date-key';
import { LifeRoutine } from '@/routines/entities/life-routine.entity';
import { RoutineCheck } from '@/routines/entities/routine-check.entity';
import type { CreateRoutineDto } from '@/routines/dto/create-routine.dto';
import type { UpdateRoutineDto } from '@/routines/dto/update-routine.dto';
import type { RoutineResponseDto, DayRoutinesResponseDto } from '@/routines/dto/routine-response.dto';
import { isChecksRangeAllowed, completionPercent } from '@/routines/domain/routine-rules';

function present(routine: LifeRoutine): RoutineResponseDto {
  return {
    id: routine.id,
    goalId: routine.goalId,
    title: routine.title,
    description: routine.description,
    time: routine.time,
    days: routine.days,
    durationMinutes: routine.durationMinutes,
  };
}

@Injectable()
export class RoutinesService {
  constructor(
    @InjectRepository(LifeRoutine) private readonly routines: Repository<LifeRoutine>,
    @InjectRepository(RoutineCheck) private readonly checks: Repository<RoutineCheck>,
    private readonly writeLock: UserWriteLock,
  ) {}

  private async assertGoal(manager: EntityManager, userId: string, goalId: string): Promise<void> {
    const goal = await manager.getRepository(LifeGoal).findOneBy({ id: goalId, userId });
    if (!goal) throw new NotFoundException('Goal not found');
  }

  async list(userId: string, goalId?: string): Promise<RoutineResponseDto[]> {
    // A nonexistent or foreign goal must never be distinguishable via its routines.
    if (goalId) {
      const count = await this.routines.manager.getRepository(LifeGoal).countBy({ id: goalId, userId });
      if (count === 0) throw new NotFoundException('Goal not found');
    }
    const items = await this.routines.find({
      where: { userId, ...(goalId ? { goalId } : {}) },
      order: { time: 'ASC', id: 'ASC' },
    });
    return items.map(present);
  }

  async get(userId: string, id: string): Promise<RoutineResponseDto> {
    const routine = await this.routines.findOneBy({ id, userId });
    if (!routine) throw new NotFoundException('Routine not found');
    return present(routine);
  }

  create(userId: string, input: CreateRoutineDto): Promise<RoutineResponseDto> {
    return this.writeLock.run(userId, async (manager) => {
      await this.assertGoal(manager, userId, input.goalId);
      const repo = manager.getRepository(LifeRoutine);
      const result = await repo.save(repo.create({
        ...input,
        id: randomUUID(),
        userId,
        days: [...input.days].sort((a, b) => a - b),
      }));
      return present(result);
    });
  }

  update(userId: string, id: string, input: UpdateRoutineDto): Promise<RoutineResponseDto> {
    return this.writeLock.run(userId, async (manager) => {
      const repo = manager.getRepository(LifeRoutine);
      const routine = await repo.findOneBy({ id, userId });
      if (!routine) throw new NotFoundException('Routine not found');
      if (input.goalId !== undefined) await this.assertGoal(manager, userId, input.goalId);
      const changes = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
      Object.assign(routine, changes);
      if (input.days !== undefined) routine.days = [...input.days].sort((a, b) => a - b);
      return present(await repo.save(routine));
    });
  }

  remove(userId: string, id: string): Promise<void> {
    return this.writeLock.run(userId, async (manager) => {
      const result = await manager.getRepository(LifeRoutine).delete({ id, userId });
      if (!result.affected) throw new NotFoundException('Routine not found');
      // FK ON DELETE CASCADE removes all its completion dates.
    });
  }

  async day(userId: string, date: string): Promise<DayRoutinesResponseDto> {
    const weekday = isoWeekday(date);
    const items = await this.routines.createQueryBuilder('routine')
      .where('routine.userId = :userId', { userId })
      .andWhere(':weekday = ANY(routine.days)', { weekday })
      .orderBy('routine.time', 'ASC')
      .addOrderBy('routine.id', 'ASC')
      .getMany();
    const ids = items.map((routine) => routine.id);
    const doneIds = ids.length === 0 ? [] : (await this.checks.find({
      select: ['routineId'], where: { userId, date, routineId: In(ids) },
    })).map((check) => check.routineId);
    const doneSet = new Set(doneIds);
    const completed = items.filter((routine) => doneSet.has(routine.id)).length;
    const total = items.length;
    return {
      date,
      routines: items.map((routine) => ({ ...present(routine), done: doneSet.has(routine.id) })),
      stats: {
        done: completed,
        total,
        percent: completionPercent(completed, total),
        durationMinutes: items.reduce((sum, routine) => sum + routine.durationMinutes, 0),
      },
    };
  }

  async listChecks(userId: string, from: string, to: string): Promise<{ checks: Record<string, true> }> {
    // DTO has already verified both dates; service also checks the range length.
    if (!isChecksRangeAllowed(from, to)) {
      throw new BadRequestException('Check date range must be 1 to 366 days, inclusive');
    }
    const checks = await this.checks.createQueryBuilder('completion')
      .where('completion.userId = :userId', { userId })
      .andWhere('completion.date >= :from AND completion.date <= :to', { from, to })
      .orderBy('completion.date', 'ASC')
      .getMany();
    const result: Record<string, true> = {};
    for (const check of checks) result[`${check.date}|${check.routineId}`] = true;
    return { checks: result };
  }

  setDone(userId: string, routineId: string, date: string, done: boolean): Promise<{ routineId: string; date: string; done: boolean }> {
    // Match frontend's semantics: marking a day does not require it to be scheduled.
    return this.writeLock.run(userId, async (manager) => {
      const routine = await manager.getRepository(LifeRoutine).findOneBy({ id: routineId, userId });
      if (!routine) throw new NotFoundException('Routine not found');
      const repo = manager.getRepository(RoutineCheck);
      if (done) {
        await repo.createQueryBuilder().insert().values({ routineId, userId, date }).orIgnore().execute();
      } else {
        await repo.delete({ routineId, userId, date });
      }
      return { routineId, date, done };
    });
  }
}
