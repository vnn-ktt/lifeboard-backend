import { BadRequestException } from '@nestjs/common';

export interface RegisterInput {
  name: string;
  nickname: string | null;
  email: string;
  password: string;
}
export interface LoginInput { email: string; password: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICKNAME_RE = /^[\p{L}\p{N}_.-]{2,24}$/u;

function bodyObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Expected a JSON object');
  }
  return value as Record<string, unknown>;
}
function requireString(body: Record<string, unknown>, key: string): string {
  if (typeof body[key] !== 'string') {
    throw new BadRequestException(`${key} must be a string`);
  }
  return body[key] as string;
}
function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL_RE.test(email)) {
    throw new BadRequestException('Invalid email');
  }
  return email;
}

export function parseRegisterInput(value: unknown): RegisterInput {
  const body = bodyObject(value);
  const name = requireString(body, 'name').trim();
  if (name.length < 2 || name.length > 60) {
    throw new BadRequestException('name must contain 2–60 characters');
  }
  let nickname: string | null = null;
  if (body.nickname !== undefined && body.nickname !== null) {
    nickname = requireString(body, 'nickname').trim().replace(/^@/, '') || null;
    if (nickname && !NICKNAME_RE.test(nickname)) {
      throw new BadRequestException('Invalid nickname');
    }
  }
  const password = requireString(body, 'password');
  if (password.length < 12 || password.length > 128) {
    throw new BadRequestException('password must contain 12–128 characters');
  }
  return { name, nickname, email: normalizeEmail(requireString(body, 'email')), password };
}

export function parseLoginInput(value: unknown): LoginInput {
  const body = bodyObject(value);
  const password = requireString(body, 'password');
  if (password.length < 1 || password.length > 128) {
    throw new BadRequestException('Invalid credentials');
  }
  return { email: normalizeEmail(requireString(body, 'email')), password };
}
