import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { NonEmptyBodyPipe } from '@/common/pipes/non-empty-body.pipe';
import { UpdatePreferencesDto } from '@/preferences/dto/update-preferences.dto';
import { PreferencesService } from '@/preferences/preferences.service';

@ApiTags('Account preferences') @ApiCookieAuth('lifeboard.sid')
@Controller('users/me/preferences')
export class PreferencesController {
  constructor(private readonly prefs: PreferencesService) {}
  @Get() @ApiOperation({ summary: 'Get account UI preferences' })
  get(@Req() req: AuthenticatedRequest) { return this.prefs.get(req.auth.user.id); }
  @Put() @ApiOperation({ summary: 'Merge validated UI preferences' })
  update(@Req() req: AuthenticatedRequest, @Body(NonEmptyBodyPipe) body: UpdatePreferencesDto) {
    return this.prefs.set(req.auth.user.id, body);
  }
}
