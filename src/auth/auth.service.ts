import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { toPublicUser } from '@/users/dto/public-user.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { AuthResult } from './types/auth-result.type';
import { hashPassword, verifyPassword } from './lib/password';
import { SessionsService } from './services/sessions.service';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly sessions: SessionsService) {}

  async register(input: RegisterDto): Promise<AuthResult> {
    const passwordHash = await hashPassword(input.password);
    const user = await this.users.create({
      email: input.email,
      name: input.name,
      nickname: input.nickname ?? null,
      passwordHash,
    });
    const token = await this.sessions.issue(user.id);
    return { user: toPublicUser(user), token };
  }

  async login(input: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmailWithPassword(input.email);
    if (!user) {
      await hashPassword(input.password); // Reduce account-enumeration timing differences.
      throw new UnauthorizedException('Invalid credentials');
    }
    const correct = await verifyPassword(input.password, user.passwordHash);
    if (!correct) throw new UnauthorizedException('Invalid credentials');
    const token = await this.sessions.issue(user.id);
    return { user: toPublicUser(user), token };
  }

  logout(sessionId: string): Promise<void> {
    return this.sessions.revokeById(sessionId);
  }
}
