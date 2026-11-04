import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { LifeArea } from './entities/life-area.entity';
import type { CreateAreaDto } from './dto/create-area.dto';
import type { AreaResponseDto } from './dto/area-response.dto';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';

function present(area: LifeArea): AreaResponseDto {
  return { id: area.id, name: area.name, icon: area.icon, accent: area.accent, subtle: area.subtle };
}

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(LifeArea) private readonly areas: Repository<LifeArea>,
    private readonly writeLock: UserWriteLock,
  ) {}

  async list(userId: string): Promise<AreaResponseDto[]> {
    const builtins = await this.areas.find({ where: { userId: IsNull() } });
    const systemOrder = ['dogs', 'career', 'leadership', 'health', 'finance', 'relationships', 'learning', 'other'];
    builtins.sort((a, b) => systemOrder.indexOf(a.id) - systemOrder.indexOf(b.id));
    const custom = await this.areas.find({ where: { userId }, order: { createdAt: 'ASC', id: 'ASC' } });
    return [...builtins, ...custom].map(present);
  }

  create(userId: string, input: CreateAreaDto): Promise<AreaResponseDto> {
    return this.writeLock.run(userId, async (manager) => {
      const repo = manager.getRepository(LifeArea);
      const existing = await repo.createQueryBuilder('area')
        .where('LOWER(area.name) = LOWER(:name)', { name: input.name })
        .andWhere('(area.user_id IS NULL OR area.user_id = :userId)', { userId })
        .getOne();
      if (existing) throw new ConflictException('Area name already exists');
      const area = repo.create({
        id: randomUUID(), userId, name: input.name,
        icon: 'bi-grid', accent: input.accent ?? '#5b9478', subtle: '#edf5ee',
      });
      await repo.insert(area);
      return present(area);
    });
  }

  remove(userId: string, areaId: string): Promise<void> {
    return this.writeLock.run(userId, async (manager) => {
      const repo = manager.getRepository(LifeArea);
      const area = await repo.findOneBy({ id: areaId });
      if (!area) throw new NotFoundException('Area not found');
      if (area.userId === null) throw new ForbiddenException('Built-in areas cannot be deleted');
      if (area.userId !== userId) throw new NotFoundException('Area not found');
      const goalsCount = await manager.getRepository(LifeGoal).count({ where: { userId, areaId } });
      if (goalsCount) throw new ConflictException('Area is used by goals');
      await repo.delete({ id: areaId, userId });
    });
  }
}
