import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalStatusEvent } from '@/goal-status/entities/goal-status-event.entity';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import { User } from '@/users/entities/user.entity';
import { localDateKey } from '@/utils/timezone';
import { presentGoal } from '@/goals/goals.service';
import type { GoalStatus } from '@/goal-status/domain/goal-status';
import { statusTransition } from '@/goal-status/domain/goal-status';
import { decodeStatusCursor, encodeStatusCursor } from '@/goal-status/domain/status-cursor';
import type { GoalResponseDto } from '@/goals/dto/goal-response.dto';

export interface GoalStatusEventResponse {
  id: string; goalId: string; status: GoalStatus; changedAt: string;
}

function presentEvent(row: GoalStatusEvent): GoalStatusEventResponse {
  return { id: row.id, goalId: row.goalId, status: row.status, changedAt: row.changedAt.toISOString() };
}

@Injectable()
export class GoalStatusService {
  constructor(
    @InjectRepository(LifeGoal) private readonly goals: Repository<LifeGoal>,
    @InjectRepository(GoalStatusEvent) private readonly events: Repository<GoalStatusEvent>,
    private readonly lock: UserWriteLock,
  ) {}

  change(userId: string, goalId: string, nextStatus: GoalStatus): Promise<GoalResponseDto> {
    return this.lock.run(userId, async manager => {
      const goalRepo = manager.getRepository(LifeGoal);
      const goal = await goalRepo.findOneBy({ id: goalId, userId });
      if (!goal) throw new NotFoundException('Goal not found');
      if (statusTransition(goal.status, nextStatus) === 'same') return presentGoal(goal);

      const oldStatus = goal.status;
      const now = new Date();
      goal.status = nextStatus;
      goal.completedAt = nextStatus === 'completed' ? now : null;
      // Never manufacture check-ins while a goal was paused, completed or cancelled.
      // Its previous check-in history is retained, but the schedule restarts locally on reactivation.
      if (oldStatus !== 'active' && nextStatus === 'active' && goal.checkinFromDate) {
        const user = await manager.getRepository(User).findOneByOrFail({ id: userId });
        const today = localDateKey(user.timezone);
        if (goal.checkinFromDate < today) goal.checkinFromDate = today;
      }
      const saved = await goalRepo.save(goal);
      await manager.getRepository(GoalStatusEvent).insert({
        id: randomUUID(), userId, goalId, status: nextStatus, changedAt: now,
      });
      return presentGoal(saved);
    });
  }

  async history(userId: string, goalId: string, cursor?: string, limit = 30): Promise<{
    items: GoalStatusEventResponse[]; nextCursor: string | null;
  }> {
    if (!(await this.goals.existsBy({ id: goalId, userId }))) {
      throw new NotFoundException('Goal not found');
    }
    const query = this.events.createQueryBuilder('event')
      .where('event.userId = :userId AND event.goalId = :goalId', { userId, goalId });
    if (cursor) {
      const decoded = decodeStatusCursor(cursor);
      query.andWhere('(event.changedAt < :time OR (event.changedAt = :time AND event.id < :id))', {
        time: decoded.changedAt, id: decoded.id,
      });
    }
    const rows = await query.orderBy('event.changedAt', 'DESC').addOrderBy('event.id', 'DESC')
      .take(limit + 1).getMany();
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return { items: page.map(presentEvent), nextCursor: rows.length > limit && last
      ? encodeStatusCursor({ changedAt: last.changedAt, id: last.id }) : null };
  }
}
