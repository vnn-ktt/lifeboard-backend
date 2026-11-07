import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { UpdateTimezoneDto } from '@/users/dto/update-timezone.dto';
import { toPublicUser } from '@/users/dto/public-user.dto';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import type { PublicUser } from '@/users/dto/public-user.dto';

/** Protected by the default-deny global session guard. */
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Patch('me/timezone')
  async timezone(@Req() request: AuthenticatedRequest, @Body() body: UpdateTimezoneDto): Promise<PublicUser> {
    return toPublicUser(await this.users.setTimezone(request.auth.user.id, body.timezone));
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest): PublicUser {
    return request.auth.user;
  }
}
