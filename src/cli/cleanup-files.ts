import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { FilesService } from '@/files/files.service';

/** Maintenance command: reconcile S3 deletions that failed after soft-delete. */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const cleaned = await app.get(FilesService).cleanupPending();
    Logger.log(`Finalized ${cleaned} pending file deletions`, 'CleanupFiles');
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  Logger.error(error instanceof Error ? error.message : 'Cleanup failed', 'CleanupFiles');
  process.exitCode = 1;
});
