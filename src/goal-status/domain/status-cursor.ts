import { BadRequestException } from '@nestjs/common';

export type StatusCursor = { changedAt: Date; id: string };

export function encodeStatusCursor(event: StatusCursor): string {
  return Buffer.from(JSON.stringify([event.changedAt.toISOString(), event.id])).toString('base64url');
}

export function decodeStatusCursor(cursor: string): StatusCursor {
  if (!/^[A-Za-z0-9_-]{1,512}$/.test(cursor)) throw new BadRequestException('Invalid status events cursor');
  try {
    const data: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!Array.isArray(data) || data.length !== 2 || typeof data[0] !== 'string' || typeof data[1] !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data[0]) ||
        !Number.isFinite(Date.parse(data[0])) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data[1])) throw new Error('Invalid cursor');
    return { changedAt: new Date(data[0]), id: data[1] };
  } catch {
    throw new BadRequestException('Invalid status events cursor');
  }
}
