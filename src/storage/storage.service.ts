import { Inject, Injectable } from '@nestjs/common';
import { OBJECT_STORAGE } from '@/storage/interfaces/object-storage.interface';
import type { ObjectStorage, StoredObject } from '@/storage/interfaces/object-storage.interface';

/** Stable entry point used by FilesModule and future modules. */
@Injectable()
export class StorageService {
  constructor(@Inject(OBJECT_STORAGE) private readonly provider: ObjectStorage) {}
  put(key: string, body: Buffer, mimeType: string): Promise<void> {
    return this.provider.put(key, body, mimeType);
  }
  get(key: string): Promise<StoredObject> {
    return this.provider.get(key);
  }
  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }
}
