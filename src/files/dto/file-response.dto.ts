import type { StoredFile } from '@/files/entities/stored-file.entity';

export interface FileResponseDto {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

/** Never expose storage keys or bucket internals in public JSON. */
export function toFileResponse(file: StoredFile): FileResponseDto {
  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    createdAt: file.createdAt.toISOString(),
  };
}
