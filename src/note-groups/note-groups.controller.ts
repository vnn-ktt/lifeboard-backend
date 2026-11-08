import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { NonEmptyBodyPipe } from '@/common/pipes/non-empty-body.pipe';
import { CreateNoteGroupDto } from '@/note-groups/dto/create-note-group.dto';
import { UpdateNoteGroupDto } from '@/note-groups/dto/update-note-group.dto';
import { NoteGroupsService } from '@/note-groups/note-groups.service';

@ApiTags('Note groups') @ApiCookieAuth('lifeboard.sid')
@Controller('note-groups')
export class NoteGroupsController {
  constructor(private readonly groups: NoteGroupsService) {}
  @Get() @ApiOperation({ summary: 'List note groups for this account' })
  list(@Req() req: AuthenticatedRequest) { return this.groups.list(req.auth.user.id); }
  @Post() @ApiOperation({ summary: 'Create a note group' })
  create(@Req() req: AuthenticatedRequest, @Body() input: CreateNoteGroupDto) { return this.groups.create(req.auth.user.id, input); }
  @Patch(':id') @ApiOperation({ summary: 'Update an owned note group' })
  update(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(NonEmptyBodyPipe) input: UpdateNoteGroupDto) { return this.groups.update(req.auth.user.id, id, input); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ summary: 'Delete group, retaining and detaching notes' })
  remove(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.groups.remove(req.auth.user.id, id); }
}
