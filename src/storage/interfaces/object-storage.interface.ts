import type { Readable } from 'node:stream';

export interface StoredObject {
  body: Readable;
}

/** Provider-neutral contract: service code never imports S3 commands. */
export interface ObjectStorage {
  put(key: string, body: Buffer, mimeType: string): Promise<void>;
  get(key: string): Promise<StoredObject>;
  delete(key: string): Promise<void>;
}

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');
