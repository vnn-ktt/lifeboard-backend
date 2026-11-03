import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './authenticated-request';
import { parseLoginInput, parseRegisterInput } from './auth.dto';
import { AuthService } from './auth.service';
import { SESSION_COOKIE, sessionCookieOptions } from './cookie';
import { Public } from './public.decorator';
import type { PublicUser } from '../users/public-user';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  private setCookie(response: Response, token: string): void {
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(this.config.getOrThrow<boolean>('COOKIE_SECURE')));
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  async register(@Body() body: unknown, @Res({ passthrough: true }) response: Response): Promise<{ user: PublicUser }> {
    const result = await this.auth.register(parseRegisterInput(body));
    this.setCookie(response, result.token);
    return { user: result.user };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response): Promise<{ user: PublicUser }> {
    const result = await this.auth.login(parseLoginInput(body));
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
