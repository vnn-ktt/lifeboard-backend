import { NotFoundException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';

/** All nested API operations first verify the exact user-goal pair. */
export async function requireOwnedGoal(manager: EntityManager, userId: string, goalId: string): Promise<LifeGoal> {
  const goal = await manager.getRepository(LifeGoal).findOneBy({ id: goalId, userId });
  if (!goal) throw new NotFoundException('Goal not found');
  return goal;
}
