import { BadRequestException } from '@nestjs/common';
import { basename } from 'node:path';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MiB
export type SupportedImageType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Never trust the browser-supplied MIME header or file extension. */
export function detectImageType(buffer: Buffer): SupportedImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return 'image/png';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

export function validateImage(buffer: Buffer | undefined): SupportedImageType {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new BadRequestException('An image file is required');
  }
  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new BadRequestException('Image must be at most 5 MiB');
  }
  const detected = detectImageType(buffer);
  if (!detected) {
    throw new BadRequestException('Only JPEG, PNG and WebP images are supported');
  }
  return detected;
}

export function safeOriginalName(value: string): string {
  const cleaned = basename(value.replace(/\\/g, '/'))
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
    .slice(0, 180);
  return cleaned || 'image';
}

export function extensionFor(type: SupportedImageType): string {
  return type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp';
}
