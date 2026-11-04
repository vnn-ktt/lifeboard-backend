import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { createSessionToken, hashSessionToken, SESSION_TTL_MS } from '@/auth/lib/cookie';
import { UserSession } from '@/auth/entities/user-session.entity';

@Injectable()
export class SessionsService {
  constructor(@InjectRepository(UserSession) private readonly sessions: Repository<UserSession>) {}

  async issue(userId: string): Promise<string> {
    const token = createSessionToken();
    await this.sessions.insert({
      id: randomUUID(),
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      revokedAt: null,
    });
    return token;
  }

  async findActive(token: string): Promise<UserSession | null> {
    return this.sessions.findOne({
      where: {
        tokenHash: hashSessionToken(token),
        expiresAt: MoreThan(new Date()),
        revokedAt: IsNull(),
      },
    });
  }

  async revokeById(id: string): Promise<void> {
    await this.sessions.update({ id, revokedAt: IsNull() }, { revokedAt: new Date() });
  }
}
