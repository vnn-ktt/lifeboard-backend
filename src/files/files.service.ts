import { randomUUID } from 'node:crypto';
import { Injectable, Logger, NotFoundException, ServiceUnavailableException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageService } from '@/storage/storage.service';
import { extensionFor, safeOriginalName, validateImage } from '@/files/domain/image-rules';
import { FileResponseDto, toFileResponse } from '@/files/dto/file-response.dto';
import { StoredFile } from '@/files/entities/stored-file.entity';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(StoredFile) private readonly repository: Repository<StoredFile>,
    private readonly storage: StorageService,
  ) {}

  async upload(userId: string, file: Express.Multer.File | undefined): Promise<FileResponseDto> {
    const mimeType = validateImage(file?.buffer);
    const buffer = file!.buffer;
    const id = randomUUID();
    const storageKey = `users/${userId}/images/${id}.${extensionFor(mimeType)}`;
    await this.storage.put(storageKey, buffer, mimeType);

    try {
      const record = this.repository.create({
        id,
        userId,
        storageKey,
        originalName: safeOriginalName(file!.originalname),
        mimeType,
        size: buffer.length,
      });
      return toFileResponse(await this.repository.save(record));
    } catch (error) {
      // Avoid leaving a known orphan if the DB insert fails after S3 success.
      try { await this.storage.delete(storageKey); }
      catch { this.logger.error('Failed to compensate an upload after DB error; review S3 orphan objects'); }
      throw error;
    }
  }

  async getMetadata(userId: string, id: string): Promise<FileResponseDto> {
    return toFileResponse(await this.findOwned(userId, id));
  }

  async getContent(userId: string, id: string): Promise<StreamableFile> {
    const file = await this.findOwned(userId, id);
    const object = await this.storage.get(file.storageKey);
    return new StreamableFile(object.body, {
      type: file.mimeType,
      length: file.size,
      disposition: 'inline',
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    const file = await this.findOwned(userId, id);
    // Hide first; failures leave a tombstone for explicit retry, not a broken public record.
    const result = await this.repository.softDelete({ id, userId });
    if (!result.affected) throw new NotFoundException('File not found');
    await this.removeStoredFile(file);
  }

  /** Admin maintenance hook: retry S3 deletes for soft-deleted records. */
  async cleanupPending(limit = 100): Promise<number> {
    const files = await this.repository.createQueryBuilder('file')
      .withDeleted()
      .where('file.deletedAt IS NOT NULL')
      .orderBy('file.deletedAt', 'ASC')
      .take(Math.min(Math.max(limit, 1), 500))
      .getMany();
    let cleaned = 0;
    for (const file of files) {
      try { await this.removeStoredFile(file); cleaned++; }
      catch { this.logger.warn(`Deferred deletion failed for file ID ${file.id}`); }
    }
    return cleaned;
  }

  private async removeStoredFile(file: StoredFile): Promise<void> {
    await this.storage.delete(file.storageKey);
    try {
      await this.repository.delete({ id: file.id, userId: file.userId });
    } catch (error) {
      // Tombstone is still present: a later maintenance pass can retry this idempotently.
      this.logger.error(`Could not finalize file deletion for ${file.id}`);
      throw new ServiceUnavailableException('Unable to finalize file deletion');
    }
  }

  private async findOwned(userId: string, id: string): Promise<StoredFile> {
    const file = await this.repository.findOneBy({ id, userId });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }
}
