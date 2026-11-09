import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import { LifeNote } from '@/notes/entities/life-note.entity';
import { NoteGroup } from '@/note-groups/entities/note-group.entity';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { StoredFile } from '@/files/entities/stored-file.entity';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';
import type { CreateNoteDto } from '@/notes/dto/create-note.dto';
import type { UpdateNoteDto } from '@/notes/dto/update-note.dto';
import type { ListNotesQueryDto } from '@/notes/dto/list-notes-query.dto';

export interface NoteResponse {
  id: string; title: string; content: string; groupId: string | null; goalId: string | null;
  imageFileId: string | null; imageUrl: string | null; pinned: boolean; createdAt: string; updatedAt: string;
}
export function presentNote(row: LifeNote): NoteResponse {
  return {
    id: row.id, title: row.title, content: row.content, groupId: row.groupId, goalId: row.goalId,
    imageFileId: row.imageFileId,
    imageUrl: row.imageFileId ? `/api/v1/files/${row.imageFileId}/content` : null,
    pinned: row.pinned, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

type NoteLinks = { groupId?: string | null; goalId?: string | null; imageFileId?: string | null };

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(LifeNote) private readonly notes: Repository<LifeNote>,
    private readonly lock: UserWriteLock,
  ) {}

  /** Validate every relationship in the same transaction that writes the note. */
  private async verifyLinks(manager: EntityManager, userId: string, input: NoteLinks): Promise<void> {
    if (input.goalId && !(await manager.getRepository(LifeGoal).existsBy({ id: input.goalId, userId }))) {
      throw new NotFoundException('Goal not found');
    }
    if (input.groupId && !(await manager.getRepository(NoteGroup).existsBy({ id: input.groupId, userId }))) {
      throw new NotFoundException('Note group not found');
    }
    if (input.imageFileId) {
      // findOneBy automatically excludes TypeORM soft-deleted rows.
      const file = await manager.getRepository(StoredFile).findOneBy({ id: input.imageFileId, userId });
      if (!file) throw new NotFoundException('Image file not found');
    }
  }

  async list(userId: string, query: ListNotesQueryDto = {}): Promise<NoteResponse[]> {
    const where = { userId, ...(query.groupId ? { groupId: query.groupId } : {}),
      ...(query.goalId ? { goalId: query.goalId } : {}),
      ...(query.pinned !== undefined ? { pinned: query.pinned === 'true' } : {}) };
    const rows = await this.notes.find({ where, order: { pinned: 'DESC', createdAt: 'DESC', id: 'ASC' } });
    return rows.map(presentNote);
  }

  async get(userId: string, id: string): Promise<NoteResponse> {
    const row = await this.notes.findOneBy({ id, userId });
    if (!row) throw new NotFoundException('Note not found');
    return presentNote(row);
  }

  create(userId: string, input: CreateNoteDto): Promise<NoteResponse> {
    return this.lock.run(userId, async manager => {
      await this.verifyLinks(manager, userId, input);
      const repo = manager.getRepository(LifeNote);
      const row = await repo.save(repo.create({ ...input, id: randomUUID(), userId,
        groupId: input.groupId ?? null, goalId: input.goalId ?? null, imageFileId: input.imageFileId ?? null,
        content: input.content ?? '', pinned: input.pinned ?? false }));
      return presentNote(row);
    });
  }

  update(userId: string, id: string, input: UpdateNoteDto): Promise<NoteResponse> {
    return this.lock.run(userId, async manager => {
      const repo = manager.getRepository(LifeNote);
      const row = await repo.findOneBy({ id, userId });
      if (!row) throw new NotFoundException('Note not found');
      await this.verifyLinks(manager, userId, input);
      Object.assign(row, Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)));
      return presentNote(await repo.save(row));
    });
  }

  remove(userId: string, id: string): Promise<void> {
    return this.lock.run(userId, async manager => {
      const result = await manager.getRepository(LifeNote).delete({ id, userId });
      if (!result.affected) throw new NotFoundException('Note not found');
      // Intentionally retain S3 image objects: they may be shared with profile/other notes.
      // Explicit DELETE /files/:fileId is performed separately when no references remain.
    });
  }
}
