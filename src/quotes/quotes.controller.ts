import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { NonEmptyBodyPipe } from '@/common/pipes/non-empty-body.pipe';
import { SetQuoteAssignmentsDto } from '@/quotes/dto/set-quote-assignments.dto';
import { QuotesService } from '@/quotes/quotes.service';

@ApiTags('System quotes') @ApiCookieAuth('lifeboard.sid')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}
  @Get() @ApiOperation({ summary: 'Read-only system quote catalog (ru/en/de)' })
  list() { return this.quotes.list(); }
  @Get('assignments') @ApiOperation({ summary: 'Dashboard / review quote placement for current user' })
  assignments(@Req() req: AuthenticatedRequest) { return this.quotes.getAssignments(req.auth.user.id); }
  @Put('assignments') @ApiOperation({ summary: 'Update quote placements; null explicitly hides a placement' })
  setAssignments(@Req() req: AuthenticatedRequest, @Body(NonEmptyBodyPipe) body: SetQuoteAssignmentsDto) {
    return this.quotes.setAssignments(req.auth.user.id, body);
  }
}
