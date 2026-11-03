import { Controller, Get, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import type { PublicUser } from './public-user';

/** Protected by the default-deny global session guard. */
@Controller('users')
export class UsersController {
  @Get('me')
  me(@Req() request: AuthenticatedRequest): PublicUser {
    return request.auth.user;
  }
}
