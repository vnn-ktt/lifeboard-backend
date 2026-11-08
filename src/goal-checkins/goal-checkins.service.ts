import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalCheckin } from '@/goal-checkins/entities/goal-checkin.entity';
import { GoalMetricEntry } from '@/goal-metrics/entities/goal-metric-entry.entity';
import { User } from '@/users/entities/user.entity';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import { CheckinScheduleService } from '@/goal-checkins/domain/checkin-schedule.service';
import { goalOutcome } from '@/goal-metrics/domain/goal-outcome';
import { latestMetricValue, validateMetricValue } from '@/goal-metrics/domain/metric-rules';
import { CompleteCheckinDto } from '@/goal-checkins/dto/complete-checkin.dto';
import type { PendingGoalCheckinResponseDto } from '@/goal-checkins/dto/pending-checkin-response.dto';

export function presentCheckin(row: GoalCheckin) {
  return { id: row.id, goalId: row.goalId, dueDate: row.dueDate,
    completedAt: row.completedAt.toISOString(), status: row.status,
    ...(row.metricEntryId ? { metricEntryId: row.metricEntryId } : {}) };
}

@Injectable()
export class GoalCheckinsService {
  constructor(
    @InjectRepository(GoalCheckin) private readonly checkins: Repository<GoalCheckin>,
    @InjectRepository(LifeGoal) private readonly goals: Repository<LifeGoal>,
    @InjectRepository(GoalMetricEntry) private readonly metrics: Repository<GoalMetricEntry>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly lock: UserWriteLock,
    private readonly schedule: CheckinScheduleService,
  ) {}

  async due(userId: string): Promise<PendingGoalCheckinResponseDto[]> {
    const user = await this.users.findOneByOrFail({ id: userId });
    const today = this.schedule.today(user.timezone);
    const goals = (await this.goals.find({ where: { userId }, order: { createdAt: 'ASC' } }))
      .filter(goal => goal.status === 'active' && goal.measurement.type !== 'activity' && goal.checkinFrequency &&
        goal.checkinFrequency !== 'off' && goal.checkinFrequency !== 'manual');
    if (goals.length === 0) return [];
    const goalIds = goals.map(goal => goal.id);
    const [completed, metrics] = await Promise.all([
      this.checkins.find({ where: { userId, goalId: In(goalIds) }, select: ['goalId', 'dueDate'] }),
      this.metrics.find({ where: { userId, goalId: In(goalIds) },
        order: { date: 'DESC', createdAt: 'DESC', id: 'DESC' } }),
    ]);
    const completedByGoal = new Map<string, Set<string>>();
    for (const row of completed) {
      const dates = completedByGoal.get(row.goalId) ?? new Set<string>();
      dates.add(row.dueDate);
      completedByGoal.set(row.goalId, dates);
    }
    const latest = new Map<string, number>();
    for (const row of metrics) if (!latest.has(row.goalId)) latest.set(row.goalId, row.value);
    const results: PendingGoalCheckinResponseDto[] = [];
    for (const goal of goals) {
      const outcome = goalOutcome(goal.measurement, latest.get(goal.id) ?? null);
      if (outcome.completed) continue;
      const pending = this.schedule.pending(goal, today, completedByGoal.get(goal.id) ?? new Set());
      if (pending) results.push({ goalId: goal.id, ...pending, outcome });
    }
    return results.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.goalId.localeCompare(b.goalId));
  }

  async history(userId: string, goalId: string) {
    if (!(await this.goals.existsBy({ id: goalId, userId }))) throw new NotFoundException('Goal not found');
    const rows = await this.checkins.find({ where: { userId, goalId }, order: { dueDate: 'DESC' } });
    return rows.map(presentCheckin);
  }

  /** Serializes user-scoped writes and creates measurement + check-in in one PostgreSQL TX. */
  async complete(userId: string, goalId: string, body: CompleteCheckinDto) {
    try { return await this.lock.run(userId, async manager => {
      const goal = await manager.getRepository(LifeGoal).findOneBy({ id: goalId, userId });
      if (!goal) throw new NotFoundException('Goal not found');
      if (goal.status !== 'active') throw new ConflictException('Goal is not active');
      if (goal.measurement.type === 'activity') throw new BadRequestException('Activity goals do not have check-ins');
      const user = await manager.getRepository(User).findOneByOrFail({ id: userId });
      const today = this.schedule.today(user.timezone);
      if (body.dueDate > today) throw new BadRequestException('Future check-ins are forbidden');
      if (body.status !== 'updated' && (body.value !== undefined || body.note !== undefined)) {
        throw new BadRequestException('unchanged and skipped cannot contain value or note');
      }
      if (body.status === 'updated') {
        if (goal.measurement.type === 'numeric' && body.value === undefined) {
          throw new BadRequestException('Numeric updated check-ins require value');
        }
        if (goal.measurement.type === 'binary' && body.value !== undefined && body.value !== 1) {
          throw new BadRequestException('Binary updated check-ins must set 1');
        }
      }
      const repo = manager.getRepository(GoalCheckin);
      const existing = await repo.findOneBy({ goalId, userId, dueDate: body.dueDate });
      if (existing) {
        // Exact retries return the original response without inserting a second measurement.
        if (existing.status === body.status && body.status !== 'updated') return presentCheckin(existing);
        if (existing.status === 'updated' && body.status === 'updated' && existing.metricEntryId) {
          const metric = await manager.getRepository(GoalMetricEntry).findOneBy({
            id: existing.metricEntryId, userId, goalId,
          });
          if (metric && metric.value === (goal.measurement.type === 'binary' ? 1 : body.value) &&
              (metric.note ?? null) === (body.note || null)) return presentCheckin(existing);
        }
        throw new ConflictException('Check-in already completed with a different result');
      }
      const latest = await latestMetricValue(manager, userId, goalId);
      if (goalOutcome(goal.measurement, latest).completed) {
        throw new ConflictException('Goal result is already complete');
      }
      const completed = await repo.find({ where: { userId, goalId }, select: ['dueDate'] });
      const pending = this.schedule.pending(goal, today, new Set(completed.map(item => item.dueDate)));
      if (!pending || pending.dueDate !== body.dueDate) {
        throw new ConflictException('Only the earliest pending scheduled date may be completed');
      }
      let metricEntryId: string | null = null;
      if (body.status === 'updated') {
        const value = goal.measurement.type === 'binary' ? 1 : body.value!;
        validateMetricValue(goal, value);
        const metrics = manager.getRepository(GoalMetricEntry);
        const metric = await metrics.save(metrics.create({
          id: randomUUID(), userId, goalId, date: today, value, note: body.note || null,
        }));
        metricEntryId = metric.id;
      }
      const saved = await repo.save(repo.create({
        id: randomUUID(), userId, goalId, dueDate: body.dueDate, status: body.status, metricEntryId,
      }));
      return presentCheckin(saved);
    }); } catch (error: unknown) {
      const pg = error as { driverError?: { code?: string; constraint?: string } };
      if (pg.driverError?.code === '23505' && pg.driverError.constraint === 'uq_goal_checkin_goal_date') {
        throw new ConflictException('Check-in was already completed');
      }
      throw error;
    }
  }
}
