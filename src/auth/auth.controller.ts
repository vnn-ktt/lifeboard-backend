import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { LoginDto } from '@/auth/dto/login.dto';
import { RegisterDto } from '@/auth/dto/register.dto';
import { AuthService } from './auth.service';
import { SESSION_COOKIE, sessionCookieOptions } from '@/auth/lib/cookie';
import { Public } from '@/auth/decorators/public.decorator';
import type { PublicUser } from '@/users/dto/public-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  private setCookie(response: Response, token: string): void {
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(this.config.getOrThrow<boolean>('COOKIE_SECURE')));
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) response: Response): Promise<{ user: PublicUser }> {
    const result = await this.auth.register(body);
    this.setCookie(response, result.token);
    return { user: result.user };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response): Promise<{ user: PublicUser }> {
    const result = await this.auth.login(body);
    this.setCookie(response, result.token);
    return { user: result.user };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logout(request.auth.sessionId);
    const options = sessionCookieOptions(this.config.getOrThrow<boolean>('COOKIE_SECURE'));
    response.clearCookie(SESSION_COOKIE, {
      path: options.path,
      httpOnly: options.httpOnly,
      secure: options.secure,
      sameSite: options.sameSite,
    });
  }
}
