/** Small, dependency-free type guards. Use them at system boundaries. */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}
/** Short alias for call sites that prefer isBool. */
export const isBool = isBoolean;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}
