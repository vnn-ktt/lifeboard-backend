import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalMetricEntry } from '@/goal-metrics/entities/goal-metric-entry.entity';

export function validateMetricValue(goal: LifeGoal, value: number): void {
  if (goal.measurement.type === 'activity') throw new BadRequestException('Activity goals have no result measurements');
  if (!Number.isFinite(value) || Math.abs(value) > 1e12) throw new BadRequestException('Invalid result value');
  if (goal.measurement.type === 'binary' && value !== 0 && value !== 1) {
    throw new BadRequestException('Binary result must be 0 or 1');
  }
}

export async function latestMetricValue(manager: EntityManager, userId: string, goalId: string): Promise<number | null> {
  const latest = await manager.getRepository(GoalMetricEntry).findOne({
    where: { userId, goalId }, order: { date: 'DESC', createdAt: 'DESC', id: 'DESC' },
  });
  return latest?.value ?? null;
}

