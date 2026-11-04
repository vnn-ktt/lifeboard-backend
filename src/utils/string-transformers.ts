import { isString } from '@/utils/type-guards';

/** Preserve non-string values: decorators must reject them instead of coercing them. */
export function trimString(value: unknown): unknown {
  return isString(value) ? value.trim() : value;
}
export function normalizeEmail(value: unknown): unknown {
  return isString(value) ? value.trim().toLowerCase() : value;
}
export function normalizeNickname(value: unknown): unknown {
  if (!isString(value)) return value;
  return value.trim().replace(/^@/, '') || null;
}
export function normalizeHexColor(value: unknown): unknown {
  return isString(value) ? value.trim().toLowerCase() : value;
}
