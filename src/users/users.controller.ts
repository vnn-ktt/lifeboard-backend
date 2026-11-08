import { Body, Controller, Get, Patch, Put, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from '@/users/users.service';
import { NonEmptyBodyPipe } from '@/common/pipes/non-empty-body.pipe';
import { UpdateProfileDto } from '@/users/dto/update-profile.dto';
import { SetAvatarDto } from '@/users/dto/set-avatar.dto';
import { UpdateTimezoneDto } from '@/users/dto/update-timezone.dto';
import { toPublicUser } from '@/users/dto/public-user.dto';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import type { PublicUser } from '@/users/dto/public-user.dto';

/** Protected by the default-deny global session guard. */
@ApiTags('Profile') @ApiCookieAuth('lifeboard.sid')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Patch('me') @ApiOperation({ summary: 'Update current account profile (name, nickname, about)' })
  async profile(@Req() request: AuthenticatedRequest, @Body(NonEmptyBodyPipe) body: UpdateProfileDto): Promise<PublicUser> {
    return toPublicUser(await this.users.updateProfile(request.auth.user.id, body));
  }

  @Put('me/avatar') @ApiOperation({ summary: 'Attach uploaded image by fileId or clear avatar with null' })
  async avatar(@Req() request: AuthenticatedRequest, @Body() body: SetAvatarDto): Promise<PublicUser> {
    return toPublicUser(await this.users.setAvatar(request.auth.user.id, body.fileId));
  }

  @Patch('me/timezone') @ApiOperation({ summary: 'Set IANA account timezone' })
  async timezone(@Req() request: AuthenticatedRequest, @Body() body: UpdateTimezoneDto): Promise<PublicUser> {
    return toPublicUser(await this.users.setTimezone(request.auth.user.id, body.timezone));
  }

  @Get('me') @ApiOperation({ summary: 'Get authenticated user profile' })
  me(@Req() request: AuthenticatedRequest): PublicUser {
    return request.auth.user;
  }
}
