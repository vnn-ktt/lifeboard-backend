import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { NoteGroup } from '@/note-groups/entities/note-group.entity';
import type { CreateNoteGroupDto } from '@/note-groups/dto/create-note-group.dto';
import type { UpdateNoteGroupDto } from '@/note-groups/dto/update-note-group.dto';

export interface NoteGroupResponse {
  id: string; name: string; goalId: string | null; color: string; createdAt: string;
}
export function presentNoteGroup(row: NoteGroup): NoteGroupResponse {
  return { id: row.id, name: row.name, goalId: row.goalId, color: row.color,
    createdAt: row.createdAt.toISOString() };
}

@Injectable()
export class NoteGroupsService {
  constructor(
    @InjectRepository(NoteGroup) private readonly groups: Repository<NoteGroup>,
    private readonly lock: UserWriteLock,
  ) {}

  async list(userId: string): Promise<NoteGroupResponse[]> {
    return (await this.groups.find({ where: { userId }, order: { createdAt: 'ASC', id: 'ASC' } })).map(presentNoteGroup);
  }

  create(userId: string, input: CreateNoteGroupDto): Promise<NoteGroupResponse> {
    return this.lock.run(userId, async manager => {
      if (input.goalId && !(await manager.getRepository(LifeGoal).existsBy({ id: input.goalId, userId }))) {
        throw new NotFoundException('Goal not found');
      }
      const repo = manager.getRepository(NoteGroup);
      const row = await repo.save(repo.create({ id: randomUUID(), userId, name: input.name,
        color: input.color ?? '#5b9478', goalId: input.goalId ?? null }));
      return presentNoteGroup(row);
    });
  }

  update(userId: string, id: string, input: UpdateNoteGroupDto): Promise<NoteGroupResponse> {
    return this.lock.run(userId, async manager => {
      const repo = manager.getRepository(NoteGroup);
      const row = await repo.findOneBy({ id, userId });
      if (!row) throw new NotFoundException('Note group not found');
      if (input.goalId && !(await manager.getRepository(LifeGoal).existsBy({ id: input.goalId, userId }))) {
        throw new NotFoundException('Goal not found');
      }
      Object.assign(row, Object.fromEntries(Object.entries(input).filter(([,v]) => v !== undefined)));
      return presentNoteGroup(await repo.save(row));
    });
  }

  remove(userId: string, id: string): Promise<void> {
    return this.lock.run(userId, async manager => {
      // FK detaches notes through SET NULL(group_id), preserving their content.
      const result = await manager.getRepository(NoteGroup).delete({ id, userId });
      if (!result.affected) throw new NotFoundException('Note group not found');
    });
  }
}
