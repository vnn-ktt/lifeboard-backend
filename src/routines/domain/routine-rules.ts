import { daysBetweenInclusive } from '@/utils/date-key';

/** Defend against unintentionally unbounded check history responses. */
export function isChecksRangeAllowed(from: string, to: string): boolean {
  const span = daysBetweenInclusive(from, to);
  return span >= 1 && span <= 366;
}

export function completionPercent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round(done / total * 100);
}
