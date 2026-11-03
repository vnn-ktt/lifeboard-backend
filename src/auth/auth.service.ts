import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { toPublicUser, type PublicUser } from '../users/public-user';
import type { LoginInput, RegisterInput } from './auth.dto';
import { hashPassword, verifyPassword } from './password';
import { SessionsService } from './sessions.service';

export interface AuthResult { user: PublicUser; token: string }

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const passwordHash = await hashPassword(input.password);
    const user = await this.users.create({ ...input, passwordHash });
    const token = await this.sessions.issue(user.id);
    return { user: toPublicUser(user), token };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmailWithPassword(input.email);
    if (!user) {
      // Match the expensive password hash path to reduce account enumeration by timing.
      await hashPassword(input.password);
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
