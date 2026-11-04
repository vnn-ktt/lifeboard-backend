import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { LifeArea } from '@/areas/entities/life-area.entity';
import { LifeGoal } from './entities/life-goal.entity';
import type { CreateGoalDto } from './dto/create-goal.dto';
import type { UpdateGoalDto } from './dto/update-goal.dto';
import type { GoalResponseDto } from './dto/goal-response.dto';
import { createsGoalCycle } from './domain/goal-rules';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';

/** Keep public JSON shape compatible with the current Vue frontend. */
function present(goal: LifeGoal): GoalResponseDto {
  return {
    id: goal.id,
    areaId: goal.areaId,
    title: goal.title,
    description: goal.description,
    horizon: goal.horizon,
    target: goal.target,
    parentId: goal.parentId,
    createdAt: goal.createdAt.toISOString(),
  };
}

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(LifeGoal) private readonly goals: Repository<LifeGoal>,
    private readonly writeLock: UserWriteLock,
  ) {}

  async list(userId: string): Promise<GoalResponseDto[]> {
    const goals = await this.goals.find({ where: { userId }, order: { createdAt: 'ASC', id: 'ASC' } });
    return goals.map(present);
  }

  async get(userId: string, goalId: string): Promise<GoalResponseDto> {
    const goal = await this.goals.findOneBy({ id: goalId, userId });
    if (!goal) throw new NotFoundException('Goal not found');
    return present(goal);
  }

  private async validateArea(manager: EntityManager, userId: string, areaId: string): Promise<void> {
    const area = await manager.getRepository(LifeArea).findOneBy({ id: areaId });
    if (!area || (area.userId !== null && area.userId !== userId)) {
      throw new NotFoundException('Area not found');
    }
  }

  private async validateParent(
    manager: EntityManager, userId: string, goalId: string, parentId: string | null,
  ): Promise<void> {
    if (!parentId) return;
    const repo = manager.getRepository(LifeGoal);
    const parent = await repo.findOneBy({ id: parentId, userId });
    if (!parent) throw new NotFoundException('Parent goal not found');
    // Lock on the user's row serializes *all* tree edits performed by our API.
    const goals = await repo.find({ where: { userId }, select: ['id', 'parentId'] });
    const parentById = new Map(goals.map((goal) => [goal.id, goal.parentId]));
    if (createsGoalCycle(goalId, parentId, parentById)) {
      throw new BadRequestException('Circular goal hierarchy');
    }
  }

  create(userId: string, input: CreateGoalDto): Promise<GoalResponseDto> {
    return this.writeLock.run(userId, async (manager) => {
      await this.validateArea(manager, userId, input.areaId);
      const id = randomUUID();
      await this.validateParent(manager, userId, id, input.parentId ?? null);
      const repo = manager.getRepository(LifeGoal);
      const created = await repo.save(repo.create({
        ...input,
        parentId: input.parentId ?? null,
        id,
        userId,
        focusPosition: null,
      }));
      return present(created);
    });
  }

  update(userId: string, goalId: string, input: UpdateGoalDto): Promise<GoalResponseDto> {
    return this.writeLock.run(userId, async (manager) => {
      const repo = manager.getRepository(LifeGoal);
      const goal = await repo.findOneBy({ id: goalId, userId });
      if (!goal) throw new NotFoundException('Goal not found');
      if (input.areaId !== undefined) await this.validateArea(manager, userId, input.areaId);
      if (input.parentId !== undefined) {
        await this.validateParent(manager, userId, goalId, input.parentId);
      }
      // DTO classes may contain initialized-but-undefined optional fields.
      // Do not overwrite existing entity fields with them on PATCH.
      const changes = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined),
      );
      Object.assign(goal, changes);
      const updated = await repo.save(goal);
      return present(updated);
    });
  }

  remove(userId: string, goalId: string): Promise<void> {
    return this.writeLock.run(userId, async (manager) => {
      const repo = manager.getRepository(LifeGoal);
      const goal = await repo.findOneBy({ id: goalId, userId });
      if (!goal) throw new NotFoundException('Goal not found');
      // SQL FK sets direct children's parent_id to NULL. The same SQL deletion
      // will later cascade routines and detach notes/groups via their FKs.
      await repo.delete({ id: goalId, userId });
    });
  }

  async focus(userId: string): Promise<{ goalIds: string[] }> {
    const goals = await this.goals.createQueryBuilder('goal')
      .where('goal.userId = :userId', { userId })
      .andWhere('goal.focusPosition IS NOT NULL')
      .orderBy('goal.focusPosition', 'ASC')
      .getMany();
    return { goalIds: goals.map((goal) => goal.id) };
  }

  setFocus(userId: string, goalIds: string[]): Promise<{ goalIds: string[] }> {
    return this.writeLock.run(userId, async (manager) => {
      const repo = manager.getRepository(LifeGoal);
      if (goalIds.length > 0) {
        const found = await repo.find({ where: { userId, id: In(goalIds) }, select: ['id'] });
        if (found.length !== goalIds.length) throw new NotFoundException('One or more goals not found');
      }
      // Clear first to avoid partial-index collisions when reordering.
      await repo.createQueryBuilder()
        .update(LifeGoal)
        .set({ focusPosition: null })
        .where("user_id = :userId", { userId })
        .andWhere("focus_position IS NOT NULL")
        .execute();
      for (const [position, id] of goalIds.entries()) {
        await repo.update({ id, userId }, { focusPosition: position });
      }
      return { goalIds };
    });
  }
}
