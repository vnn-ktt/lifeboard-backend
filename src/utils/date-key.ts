/** A date-only string in the user's calendar; never a JavaScript timestamp. */
export type DateKey = string;

/** Validate exact YYYY-MM-DD formatting and the actual Gregorian calendar day. */
export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function parse(value: DateKey): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function fromUtcDate(date: Date): DateKey {
  return `${date.getUTCFullYear().toString().padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function addDays(date: DateKey, days: number): DateKey {
  const value = parse(date);
  value.setUTCDate(value.getUTCDate() + days);
  return fromUtcDate(value);
}

/** Monday = 1, Sunday = 7, same as frontend date.ts. */
export function isoWeekday(date: DateKey): number {
  const jsDay = parse(date).getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function mondayOf(date: DateKey): DateKey {
  return addDays(date, 1 - isoWeekday(date));
}

/** Range is inclusive; use UTC arithmetic to avoid DST changes. */
export function daysBetweenInclusive(from: DateKey, to: DateKey): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000) + 1;
}

/** Date-only APIs should receive the browser's local date; UTC is the documented default. */
export function todayUtc(): DateKey {
  return fromUtcDate(new Date());
}
