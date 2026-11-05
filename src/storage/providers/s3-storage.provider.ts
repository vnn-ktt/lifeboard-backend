import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import type { ObjectStorage, StoredObject } from '@/storage/interfaces/object-storage.interface';

/** Private bucket: all reads go through FilesController's session authorization. */
@Injectable()
export class S3StorageProvider implements ObjectStorage {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
    this.client = new S3Client({
      endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
      region: config.getOrThrow<string>('S3_REGION'),
      forcePathStyle: config.getOrThrow<boolean>('S3_FORCE_PATH_STYLE'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
      },
      maxAttempts: 3,
    });
  }

  async put(key: string, body: Buffer, mimeType: string): Promise<void> {
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
        ContentLength: body.length,
        // No ACL; the bucket's default policy must remain private.
      }));
    } catch (error) {
      this.logFailure('put', error);
    }
  }

  async get(key: string): Promise<StoredObject> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!result.Body || !('pipe' in result.Body)) throw new Error('S3 did not return a Node.js stream');
      // With the default Node.js AWS SDK handler, Body is a Node.js Readable stream.
      return { body: result.Body as Readable };
    } catch (error) {
      this.logFailure('get', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      // S3 DeleteObject is idempotent, including for absent keys.
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      this.logFailure('delete', error);
    }
  }

  private logFailure(operation: string, error: unknown): never {
    const code = error instanceof Error ? error.name : 'UnknownError';
    // Do not log credentials, request headers or object content.
    this.logger.error(`S3 ${operation} failed (${code})`);
    throw new ServiceUnavailableException('File storage is temporarily unavailable');
  }
}
