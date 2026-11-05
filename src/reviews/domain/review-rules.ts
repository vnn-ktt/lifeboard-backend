import { daysBetweenInclusive, mondayOf } from '@/utils/date-key';

/** Accept calendar-day input; a reflection is always keyed by its Monday. */
export function reviewWeekStart(date: string): string {
  return mondayOf(date);
}

/** History is explicitly bounded; clients must request both ends of the range. */
export function isReviewRangeAllowed(from: string, to: string): boolean {
  const span = daysBetweenInclusive(from, to);
  return span >= 1 && span <= 366;
}
