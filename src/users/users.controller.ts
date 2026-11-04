import { Controller, Get, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import type { PublicUser } from '@/users/dto/public-user.dto';

/** Protected by the default-deny global session guard. */
@Controller('users')
export class UsersController {
  @Get('me')
  me(@Req() request: AuthenticatedRequest): PublicUser {
    return request.auth.user;
  }
}
