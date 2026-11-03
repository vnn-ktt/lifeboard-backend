import type { CookieOptions } from 'express';
import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'lifeboard.sid';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Do not accept ambiguous cookies with the same name more than once. */
export function readSessionCookie(header: string | undefined): string | null {
  const matches = (header ?? '').split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(SESSION_COOKIE.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export function sessionCookieOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/v1',
    maxAge: SESSION_TTL_MS,
  };
}
