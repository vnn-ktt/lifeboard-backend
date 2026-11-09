import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { NonEmptyBodyPipe } from '@/common/pipes/non-empty-body.pipe';
import { CreateNoteDto } from '@/notes/dto/create-note.dto';
import { UpdateNoteDto } from '@/notes/dto/update-note.dto';
import { ListNotesQueryDto } from '@/notes/dto/list-notes-query.dto';
import { NotesService } from '@/notes/notes.service';

@ApiTags('Notes') @ApiCookieAuth('lifeboard.sid')
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}
  @Get() @ApiOperation({ summary: 'List owned notes, pinned first' })
  list(@Req() req: AuthenticatedRequest, @Query() query: ListNotesQueryDto) { return this.notes.list(req.auth.user.id, query); }
  @Get(':id') @ApiOperation({ summary: 'Get an owned note' })
  get(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.notes.get(req.auth.user.id, id); }
  @Post() @ApiOperation({ summary: 'Create note with optional goal, group and previously uploaded file ID' })
  create(@Req() req: AuthenticatedRequest, @Body() input: CreateNoteDto) { return this.notes.create(req.auth.user.id, input); }
  @Patch(':id') @ApiOperation({ summary: 'Update note, only specified fields' })
  update(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(NonEmptyBodyPipe) input: UpdateNoteDto) { return this.notes.update(req.auth.user.id, id, input); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ summary: 'Delete note but not its file' })
  remove(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.notes.remove(req.auth.user.id, id); }
}
