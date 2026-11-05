import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Readable } from 'node:stream';
import { NotFoundException, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { FilesService } from '@/files/files.service';
import { StoredFile } from '@/files/entities/stored-file.entity';
import { detectImageType, safeOriginalName, validateImage, MAX_IMAGE_SIZE } from '@/files/domain/image-rules';
import { StorageService } from '@/storage/storage.service';
import { validateEnvironment } from '@/config/environment';

const userA = '00000000-0000-4000-8000-000000000001';
const userB = '00000000-0000-4000-8000-000000000002';
const jpeg = Buffer.from([255, 216, 255, 224, 0, 16]);
const png = Buffer.from([137,80,78,71,13,10,26,10,0,0]);
const webp = Buffer.from('RIFF1234WEBPxxxx','ascii');

function fixture() {
  const records = new Map<string, StoredFile>();
  const blobs = new Map<string, Buffer>();
  let brokenDelete = false;
  let brokenSave = false;
  const repo = {
    create: (input: StoredFile) => ({ ...input, createdAt: new Date('2026-11-05T00:00:00Z'), deletedAt: null }) as StoredFile,
    save: async (file: StoredFile) => {
      if (brokenSave) throw new Error('DB unavailable');
      records.set(file.id, file);
      return file;
    },
    findOneBy: async ({ id, userId }: { id: string; userId: string }) => {
      const record = records.get(id);
      return record && record.userId === userId && !record.deletedAt ? record : null;
    },
    softDelete: async ({ id, userId }: { id: string; userId: string }) => {
      const file = records.get(id);
      if (!file || file.userId !== userId || file.deletedAt) return { affected: 0 };
      file.deletedAt = new Date();
      return { affected: 1 };
    },
    delete: async ({ id, userId }: { id: string; userId: string }) => {
      if (records.get(id)?.userId === userId) records.delete(id);
    },
    createQueryBuilder: () => ({
      withDeleted() { return this; },
      where() { return this; },
      orderBy() { return this; },
      take() { return this; },
      getMany: async () => [...records.values()].filter((row) => row.deletedAt),
    }),
  };
  const storage = {
    put: async (key: string, buffer: Buffer) => { blobs.set(key, buffer); },
    get: async (key: string) => {
      const blob = blobs.get(key);
      if (!blob) throw new ServiceUnavailableException('missing');
      return { body: Readable.from(blob) };
    },
    delete: async (key: string) => {
      if (brokenDelete) throw new ServiceUnavailableException('s3 unavailable');
      blobs.delete(key);
    },
  };
  const service = new FilesService(repo as unknown as Repository<StoredFile>, storage as unknown as StorageService);
  return { service, records, blobs, setBrokenDelete: (v: boolean) => { brokenDelete = v; },
    setBrokenSave: (v: boolean) => { brokenSave = v; } };
}
const upload = (originalname = 'avatar.svg', buffer = jpeg) => ({ buffer, originalname }) as Express.Multer.File;

test('magic bytes determine MIME, ignoring the original extension', () => {
  assert.equal(detectImageType(jpeg), 'image/jpeg');
  assert.equal(detectImageType(png), 'image/png');
  assert.equal(detectImageType(webp), 'image/webp');
  assert.equal(detectImageType(Buffer.from('<svg></svg>')), null);
  assert.equal(validateImage(jpeg), 'image/jpeg');
  assert.throws(() => validateImage(Buffer.alloc(0)), BadRequestException);
  assert.throws(() => validateImage(Buffer.alloc(MAX_IMAGE_SIZE+1)), BadRequestException);
  assert.equal(safeOriginalName('C:\\fakepath\\photo.png'), 'photo.png');
  assert.equal(safeOriginalName('../../photo.png'), 'photo.png');
});

test('upload persists metadata and keeps storage key private', async () => {
  const { service, records, blobs } = fixture();
  const result = await service.upload(userA, upload());
  assert.equal(result.originalName, 'avatar.svg');
  assert.equal(result.mimeType, 'image/jpeg');
  assert.equal(result.size, jpeg.length);
  assert.equal(Object.hasOwn(result, 'storageKey'), false);
  const record = records.get(result.id)!;
  assert.match(record.storageKey, /^users\/.+\/images\/.+\.jpg$/);
  assert.deepEqual(blobs.get(record.storageKey), jpeg);
  assert.deepEqual(await service.getMetadata(userA, result.id), result);
});

test('a different user cannot retrieve or delete another user image', async () => {
  const { service, records } = fixture();
  const result = await service.upload(userA, upload());
  await assert.rejects(service.getMetadata(userB, result.id), NotFoundException);
  await assert.rejects(service.getContent(userB, result.id), NotFoundException);
  await assert.rejects(service.remove(userB, result.id), NotFoundException);
  assert.equal(records.size, 1);
});

test('download streams the object, deletion removes S3 object and metadata', async () => {
  const { service, records, blobs } = fixture();
  const result = await service.upload(userA, upload());
  const response = await service.getContent(userA, result.id);
  assert.equal(response.getHeaders().type, 'image/jpeg');
  await service.remove(userA, result.id);
  assert.equal(records.size, 0);
  assert.equal(blobs.size, 0);
  await assert.rejects(service.getMetadata(userA, result.id), NotFoundException);
});

test('upload DB failure attempts to delete the uploaded object', async () => {
  const { service, blobs, setBrokenSave } = fixture();
  setBrokenSave(true);
  await assert.rejects(service.upload(userA, upload()), /DB unavailable/);
  assert.equal(blobs.size, 0);
});

test('failed S3 deletion keeps a tombstone and retry cleanup succeeds', async () => {
  const { service, blobs, records, setBrokenDelete } = fixture();
  const result = await service.upload(userA, upload());
  setBrokenDelete(true);
  await assert.rejects(service.remove(userA, result.id), ServiceUnavailableException);
  await assert.rejects(service.getMetadata(userA, result.id), NotFoundException);
  assert.equal(blobs.size, 1);
  assert.equal(records.size, 1);
  setBrokenDelete(false);
  assert.equal(await service.cleanupPending(), 1);
  assert.equal(blobs.size, 0);
  assert.equal(records.size, 0);
});

test('production requires an HTTPS S3 endpoint and explicit credentials', () => {
  const env = { DB_HOST:'localhost', DB_USER:'user', DB_PASSWORD:'password', DB_NAME:'test', NODE_ENV:'production',
    S3_ENDPOINT:'https://storage.yandexcloud.net', S3_BUCKET:'lifeboard-prod',
    S3_ACCESS_KEY_ID:'key', S3_SECRET_ACCESS_KEY:'secret' };
  assert.equal(validateEnvironment(env).S3_REGION, 'ru-central1');
  assert.throws(() => validateEnvironment({...env, S3_ENDPOINT:'http://storage:8333'}), /HTTPS/);
  assert.throws(() => validateEnvironment({...env, S3_SECRET_ACCESS_KEY: undefined}), /S3_SECRET_ACCESS_KEY/);
});
