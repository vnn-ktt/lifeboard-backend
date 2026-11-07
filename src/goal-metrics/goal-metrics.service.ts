import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { User } from '@/users/entities/user.entity';
import { GoalMetricEntry } from '@/goal-metrics/entities/goal-metric-entry.entity';
import { CreateMetricEntryDto } from '@/goal-metrics/dto/create-metric-entry.dto';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import { localDateKey } from '@/utils/timezone';
import { validateMetricValue, latestMetricValue } from '@/goal-metrics/domain/metric-rules';
import { goalOutcome } from '@/goal-metrics/domain/goal-outcome';

export function presentMetric(row: GoalMetricEntry) {
  return { id: row.id, goalId: row.goalId, date: row.date, value: row.value,
    ...(row.note ? { note: row.note } : {}), createdAt: row.createdAt.toISOString() };
}

@Injectable()
export class GoalMetricsService {
  constructor(
    @InjectRepository(GoalMetricEntry) private readonly metrics: Repository<GoalMetricEntry>,
    @InjectRepository(LifeGoal) private readonly goals: Repository<LifeGoal>,
    private readonly lock: UserWriteLock,
  ) {}

  async list(userId: string, goalId: string) {
    if (!(await this.goals.existsBy({ userId, id: goalId }))) throw new NotFoundException('Goal not found');
    const entries = await this.metrics.find({ where: { userId, goalId },
      order: { date: 'ASC', createdAt: 'ASC', id: 'ASC' } });
    return entries.map(presentMetric);
  }

  async create(userId: string, goalId: string, input: CreateMetricEntryDto) {
    return this.lock.run(userId, async manager => {
      const goal = await manager.getRepository(LifeGoal).findOneBy({ id: goalId, userId });
      if (!goal) throw new NotFoundException('Goal not found');
      validateMetricValue(goal, input.value);
      const beforeValue = await latestMetricValue(manager, userId, goalId);
      const timezone = (await manager.getRepository(User).findOneByOrFail({ id: userId })).timezone;
      const today = localDateKey(timezone);
      const date = input.date ?? today;
      if (date > today) throw new BadRequestException('Cannot create a measurement in the future');
      const previouslyCompleted = goalOutcome(goal.measurement, beforeValue).completed;
      const repo = manager.getRepository(GoalMetricEntry);
      const saved = await repo.save(repo.create({ id: randomUUID(), userId, goalId, date,
        value: input.value, note: input.note || null }));
      if (previouslyCompleted && !goalOutcome(goal.measurement,
          await latestMetricValue(manager, userId, goalId)).completed && goal.checkinFromDate) {
        // Resuming a completed goal must not create overdue reminders for its paused interval.
        goal.checkinFromDate = today;
        await manager.getRepository(LifeGoal).save(goal);
      }
      return presentMetric(saved);
    });
  }

  async remove(userId: string, goalId: string, entryId: string): Promise<void> {
    return this.lock.run(userId, async manager => {
      const goal = await manager.getRepository(LifeGoal).findOneBy({ id: goalId, userId });
      if (!goal) throw new NotFoundException('Goal not found');
      const previouslyCompleted = goalOutcome(goal.measurement,
        await latestMetricValue(manager, userId, goalId)).completed;
      const removed = await manager.getRepository(GoalMetricEntry).delete({ id: entryId, goalId, userId });
      if (!removed.affected) throw new NotFoundException('Measurement not found');
      if (previouslyCompleted && !goalOutcome(goal.measurement,
          await latestMetricValue(manager, userId, goalId)).completed && goal.checkinFromDate) {
        const timezone = (await manager.getRepository(User).findOneByOrFail({ id: userId })).timezone;
        goal.checkinFromDate = localDateKey(timezone);
        await manager.getRepository(LifeGoal).save(goal);
      }
      // Completed check-in rows keep their status, metricEntryId becomes NULL via FK.
    });
  }
}
