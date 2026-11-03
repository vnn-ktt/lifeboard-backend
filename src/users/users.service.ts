import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export interface NewUser {
  email: string;
  name: string;
  nickname: string | null;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
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
