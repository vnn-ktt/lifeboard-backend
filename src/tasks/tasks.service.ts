import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalMilestone } from '@/milestones/entities/goal-milestone.entity';
import { GoalTask } from '@/tasks/entities/goal-task.entity';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import { requireOwnedGoal } from '@/goals/domain/owned-goal';
import type { CreateTaskDto } from '@/tasks/dto/create-task.dto';
import type { UpdateTaskDto } from '@/tasks/dto/update-task.dto';

export interface TaskResponseDto {
  id: string; goalId: string; milestoneId: string | null; title: string; description: string;
  dueDate?: string; completedAt: string | null; createdAt: string;
}

export function presentTask(item: GoalTask): TaskResponseDto {
  return { id: item.id, goalId: item.goalId, milestoneId: item.milestoneId,
    title: item.title, description: item.description,
    ...(item.dueDate ? { dueDate: item.dueDate } : {}),
    completedAt: item.completedAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() };
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(LifeGoal) private readonly goals: Repository<LifeGoal>,
    @InjectRepository(GoalTask) private readonly tasks: Repository<GoalTask>,
    private readonly lock: UserWriteLock,
  ) {}

  private async requireMilestone(manager: EntityManager, userId: string, goalId: string, milestoneId: string | null): Promise<void> {
    if (milestoneId === null) return;
    if (!(await manager.getRepository(GoalMilestone).existsBy({ id: milestoneId, userId, goalId }))) {
      throw new NotFoundException('Milestone not found for this goal');
    }
  }

  async list(userId: string, goalId: string): Promise<TaskResponseDto[]> {
    if (!(await this.goals.existsBy({ id: goalId, userId }))) throw new NotFoundException('Goal not found');
    const rows = await this.tasks.find({ where: { userId, goalId }, order: { createdAt: 'ASC', id: 'ASC' } });
    return rows.map(presentTask);
  }

  /** Open tasks due now, overdue, plus unscheduled. Paused/completed/cancelled goals are excluded from Today. */
  async due(userId: string, date: string): Promise<TaskResponseDto[]> {
    const rows = await this.tasks.createQueryBuilder('task')
      .innerJoin(LifeGoal, 'goal', 'goal.id = task.goalId AND goal.userId = task.userId')
      .where('task.userId = :userId', { userId })
      .andWhere('goal.status = :status', { status: 'active' })
      .andWhere('task.completedAt IS NULL')
      .andWhere('(task.dueDate IS NULL OR task.dueDate <= :date)', { date })
      .orderBy('CASE WHEN task.dueDate IS NULL THEN 1 ELSE 0 END', 'ASC')
      .addOrderBy('task.dueDate', 'ASC')
      .addOrderBy('task.createdAt', 'ASC')
      .addOrderBy('task.id', 'ASC')
      .getMany();
    return rows.map(presentTask);
  }

  create(userId: string, goalId: string, data: CreateTaskDto): Promise<TaskResponseDto> {
    return this.lock.run(userId, async manager => {
      await requireOwnedGoal(manager, userId, goalId);
      await this.requireMilestone(manager, userId, goalId, data.milestoneId ?? null);
      const repo = manager.getRepository(GoalTask);
      const item = await repo.save(repo.create({ ...data, id: randomUUID(), userId, goalId,
        milestoneId: data.milestoneId ?? null, dueDate: data.dueDate ?? null,
        description: data.description ?? '', completedAt: null }));
      return presentTask(item);
    });
  }

  update(userId: string, goalId: string, taskId: string, data: UpdateTaskDto): Promise<TaskResponseDto> {
    return this.lock.run(userId, async manager => {
      await requireOwnedGoal(manager, userId, goalId);
      const repo = manager.getRepository(GoalTask);
      const task = await repo.findOneBy({ id: taskId, userId, goalId });
      if (!task) throw new NotFoundException('Task not found');
      if (data.milestoneId !== undefined) await this.requireMilestone(manager, userId, goalId, data.milestoneId);
      Object.assign(task, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
      return presentTask(await repo.save(task));
    });
  }

  complete(userId: string, goalId: string, taskId: string, completed: boolean): Promise<TaskResponseDto> {
    return this.lock.run(userId, async manager => {
      await requireOwnedGoal(manager, userId, goalId);
      const repo = manager.getRepository(GoalTask);
      const task = await repo.findOneBy({ id: taskId, userId, goalId });
      if (!task) throw new NotFoundException('Task not found');
      if ((task.completedAt !== null) === completed) return presentTask(task);
      task.completedAt = completed ? new Date() : null;
      return presentTask(await repo.save(task));
    });
  }

  remove(userId: string, goalId: string, taskId: string): Promise<void> {
    return this.lock.run(userId, async manager => {
      await requireOwnedGoal(manager, userId, goalId);
      const result = await manager.getRepository(GoalTask).delete({ id: taskId, userId, goalId });
      if (!result.affected) throw new NotFoundException('Task not found');
    });
  }
}
