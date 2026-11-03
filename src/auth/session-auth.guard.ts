import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';
import { toPublicUser } from '../users/public-user';
import { readSessionCookie } from './cookie';
import type { AuthenticatedRequest } from './authenticated-request';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SessionsService } from './sessions.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = readSessionCookie(request.headers.cookie);
    if (!token) throw new UnauthorizedException();
    const session = await this.sessions.findActive(token);
    if (!session) throw new UnauthorizedException();
    const user = await this.users.findById(session.userId);
    if (!user) throw new UnauthorizedException();
    (request as AuthenticatedRequest).auth = { user: toPublicUser(user), sessionId: session.id };
    return true;
  }
}
