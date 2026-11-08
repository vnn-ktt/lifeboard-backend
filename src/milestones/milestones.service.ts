import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalMilestone } from '@/milestones/entities/goal-milestone.entity';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import { requireOwnedGoal } from '@/goals/domain/owned-goal';
import type { CreateMilestoneDto } from '@/milestones/dto/create-milestone.dto';
import type { UpdateMilestoneDto } from '@/milestones/dto/update-milestone.dto';

export interface MilestoneResponseDto {
  id: string; goalId: string; title: string; description: string; order: number;
  dueDate?: string; completedAt: string | null; createdAt: string;
}

export function presentMilestone(item: GoalMilestone): MilestoneResponseDto {
  return { id: item.id, goalId: item.goalId, title: item.title, description: item.description,
    order: item.order, ...(item.dueDate ? { dueDate: item.dueDate } : {}),
    completedAt: item.completedAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() };
}

@Injectable()
export class MilestonesService {
  constructor(
    @InjectRepository(LifeGoal) private readonly goals: Repository<LifeGoal>,
    @InjectRepository(GoalMilestone) private readonly milestones: Repository<GoalMilestone>,
    private readonly lock: UserWriteLock,
  ) {}

  async list(userId: string, goalId: string): Promise<MilestoneResponseDto[]> {
    if (!(await this.goals.existsBy({ id: goalId, userId }))) throw new NotFoundException('Goal not found');
    const rows = await this.milestones.find({ where: { userId, goalId }, order: { order: 'ASC', createdAt: 'ASC', id: 'ASC' } });
    return rows.map(presentMilestone);
  }

  create(userId: string, goalId: string, data: CreateMilestoneDto): Promise<MilestoneResponseDto> {
    return this.lock.run(userId, async manager => {
      await requireOwnedGoal(manager, userId, goalId);
      const repo = manager.getRepository(GoalMilestone);
      const item = await repo.save(repo.create({ ...data, id: randomUUID(), userId, goalId,
        description: data.description ?? '', dueDate: data.dueDate ?? null, completedAt: null }));
      return presentMilestone(item);
    });
  }

  update(userId: string, goalId: string, milestoneId: string, data: UpdateMilestoneDto): Promise<MilestoneResponseDto> {
    return this.lock.run(userId, async manager => {
      await requireOwnedGoal(manager, userId, goalId);
      const repo = manager.getRepository(GoalMilestone);
      const item = await repo.findOneBy({ id: milestoneId, userId, goalId });
      if (!item) throw new NotFoundException('Milestone not found');
      Object.assign(item, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
      return presentMilestone(await repo.save(item));
    });
  }

  complete(userId: string, goalId: string, milestoneId: string, completed: boolean): Promise<MilestoneResponseDto> {
    return this.lock.run(userId, async manager => {
      await requireOwnedGoal(manager, userId, goalId);
      const repo = manager.getRepository(GoalMilestone);
      const item = await repo.findOneBy({ id: milestoneId, userId, goalId });
      if (!item) throw new NotFoundException('Milestone not found');
      if ((item.completedAt !== null) === completed) return presentMilestone(item);
      item.completedAt = completed ? new Date() : null;
      return presentMilestone(await repo.save(item));
    });
  }

  remove(userId: string, goalId: string, milestoneId: string): Promise<void> {
    return this.lock.run(userId, async manager => {
      await requireOwnedGoal(manager, userId, goalId);
      const affected = await manager.getRepository(GoalMilestone).delete({ id: milestoneId, userId, goalId });
      if (!affected.affected) throw new NotFoundException('Milestone not found');
      // FK ON DELETE SET NULL(milestone_id) detaches tasks; they are never deleted here.
    });
  }
}
