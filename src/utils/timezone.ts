import { isDateKey } from '@/utils/date-key';

/** A missing account timezone is always UTC, never the server's system timezone. */
export function validIanaTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 64) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: value }); return true; }
  catch { return false; }
}
export function localDateKey(timezone: string, instant = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const result = `${get('year')}-${get('month')}-${get('day')}`;
  if (!isDateKey(result)) throw new Error('Cannot resolve local calendar date');
  return result;
}
