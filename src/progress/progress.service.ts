import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalMetricEntry } from '@/goal-metrics/entities/goal-metric-entry.entity';
import { goalOutcome } from '@/goal-metrics/domain/goal-outcome';
import { LifeRoutine } from '@/routines/entities/life-routine.entity';
import { RoutineCheck } from '@/routines/entities/routine-check.entity';
import { addDays, mondayOf, todayUtc } from '@/utils/date-key';
import { goalCompletionPercent, goalPeriodBounds, weeklyPlanStats } from '@/progress/domain/progress-rules';
import type { GoalProgressResponseDto } from '@/progress/dto/goal-progress-response.dto';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(LifeGoal) private readonly goals: Repository<LifeGoal>,
    @InjectRepository(GoalMetricEntry) private readonly metrics: Repository<GoalMetricEntry>,
    @InjectRepository(LifeRoutine) private readonly routines: Repository<LifeRoutine>,
    @InjectRepository(RoutineCheck) private readonly checks: Repository<RoutineCheck>,
  ) {}

  async goal(userId: string, goalId: string, at: string = todayUtc()): Promise<GoalProgressResponseDto> {
    const goal = await this.goals.findOneBy({ id: goalId, userId });
    if (!goal) throw new NotFoundException('Goal not found');
    const period = goalPeriodBounds(goal, at);
    const result = await this.checks.createQueryBuilder('completion')
      .innerJoin(LifeRoutine, 'routine', 'routine.id = completion.routineId AND routine.userId = :userId', { userId })
      .select('COUNT(*)', 'done')
      .where('routine.goalId = :goalId', { goalId })
      .andWhere('completion.userId = :userId', { userId })
      .andWhere('completion.date >= :from AND completion.date < :to', { from: period.from, to: period.toExclusive })
      .getRawOne<{ done: string }>();
    const done = Number(result?.done ?? 0);
    const activityPercent = goalCompletionPercent(done, goal.target);
    const lastMetric = goal.measurement.type === 'activity' ? null : await this.metrics
      .createQueryBuilder('metric')
      .where('metric.goalId = :goalId AND metric.userId = :userId AND metric.date <= :at', { goalId, userId, at })
      .orderBy('metric.date', 'DESC').addOrderBy('metric.createdAt', 'DESC')
      .addOrderBy('metric.id', 'DESC').getOne();
    const outcome = goalOutcome(goal.measurement, lastMetric?.value ?? null, activityPercent);
    return { goalId, at, period, done, target: goal.target, percent: outcome.percent,
      outcome, activity: { done, target: goal.target, percent: activityPercent } };
  }

  async week(userId: string, date: string): Promise<ReturnType<typeof weeklyPlanStats>> {
    const monday = mondayOf(date);
    const sunday = addDays(monday, 6);
    const [routines, checks] = await Promise.all([
      this.routines.find({ where: { userId }, select: ['id', 'days'] }),
      this.checks.createQueryBuilder('completion')
        .where('completion.userId = :userId', { userId })
        .andWhere('completion.date >= :monday AND completion.date <= :sunday', { monday, sunday })
        .getMany(),
    ]);
    const marked = new Set(checks.map((check) => `${check.date}|${check.routineId}`));
    return weeklyPlanStats(routines, marked, date);
  }
}
