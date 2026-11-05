import { Module } from '@nestjs/common';
import { OBJECT_STORAGE } from '@/storage/interfaces/object-storage.interface';
import { S3StorageProvider } from '@/storage/providers/s3-storage.provider';
import { StorageService } from '@/storage/storage.service';

@Module({
  providers: [S3StorageProvider, { provide: OBJECT_STORAGE, useExisting: S3StorageProvider }, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
