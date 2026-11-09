import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { StoredFile } from '@/files/entities/stored-file.entity';
import type { UpdateProfileDto } from '@/users/dto/update-profile.dto';
import type { NewUser } from './types/new-user.type';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>, private readonly lock: UserWriteLock) {}

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async setTimezone(userId: string, timezone: string): Promise<User> {
    return this.lock.run(userId, async manager => {
      await manager.getRepository(User).update({ id: userId }, { timezone });
      return manager.getRepository(User).findOneByOrFail({ id: userId });
    });
  }

  updateProfile(userId: string, input: UpdateProfileDto): Promise<User> {
    return this.lock.run(userId, async manager => {
      const repo = manager.getRepository(User);
      const user = await repo.findOneByOrFail({ id: userId });
      if (input.name !== undefined) user.name = input.name;
      if (input.nickname !== undefined) user.nickname = input.nickname;
      if (input.about !== undefined) user.about = input.about;
      return repo.save(user);
    });
  }

  setAvatar(userId: string, fileId: string | null): Promise<User> {
    return this.lock.run(userId, async manager => {
      if (fileId && !(await manager.getRepository(StoredFile).findOneBy({ id: fileId, userId }))) {
        throw new NotFoundException('Image file not found');
      }
      const repo = manager.getRepository(User);
      const user = await repo.findOneByOrFail({ id: userId });
      user.avatarFileId = fileId;
      return repo.save(user);
    });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  async create(input: NewUser): Promise<User> {
    try {
      return await this.users.save(this.users.create({
        id: randomUUID(),
        email: input.email,
        name: input.name,
        nickname: input.nickname,
        about: '',
        timezone: 'UTC',
        avatarFileId: null,
        passwordHash: input.passwordHash,
      }));
    } catch (error: unknown) {
      const dbError = error as { driverError?: { code?: string; constraint?: string } };
      if (dbError.driverError?.code === '23505' &&
          dbError.driverError.constraint === 'uq_users_email_lower') {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }
}
