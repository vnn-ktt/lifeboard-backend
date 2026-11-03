import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const COST = 32768;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

function derive(password: string, salt: Buffer, cost: number): Promise<Buffer> {
  return scryptAsync(password, salt, KEY_LENGTH, {
    N: cost,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: MAX_MEMORY,
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await derive(password, salt, COST);
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltText, hashText] = parts;
  // Strictly bound work factors to prevent a malformed DB value causing DoS.
  if (n !== String(COST) || r !== String(BLOCK_SIZE) || p !== String(PARALLELIZATION)) return false;
  if (!/^[A-Za-z0-9_-]{22}$/.test(saltText) || !/^[A-Za-z0-9_-]{86}$/.test(hashText)) return false;
  const expected = Buffer.from(hashText, 'base64url');
  if (expected.length !== KEY_LENGTH) return false;
  const received = await derive(password, Buffer.from(saltText, 'base64url'), COST);
  return timingSafeEqual(received, expected);
}
