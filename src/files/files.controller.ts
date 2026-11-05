import {
  Controller, Delete, Get, Header, HttpCode, HttpStatus, Param,
  ParseUUIDPipe, Post, Req, StreamableFile, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedRequest } from '@/auth/types/authenticated-request.type';
import { FilesService } from '@/files/files.service';
import type { FileResponseDto } from '@/files/dto/file-response.dto';
import { MAX_IMAGE_SIZE } from '@/files/domain/image-rules';

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: MAX_IMAGE_SIZE, files: 1, fields: 0, parts: 1 },
  }))
  upload(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<FileResponseDto> {
    return this.files.upload(request.auth.user.id, file);
  }

  @Get(':id')
  getMetadata(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<FileResponseDto> {
    return this.files.getMetadata(request.auth.user.id, id);
  }

  @Get(':id/content')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  getContent(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<StreamableFile> {
    return this.files.getContent(request.auth.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.files.remove(request.auth.user.id, id);
  }
}
