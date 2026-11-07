import { Injectable } from '@nestjs/common';
import type { LifeGoal } from '@/goals/entities/life-goal.entity';
import { addDays, daysBetweenInclusive, isoWeekday, mondayOf } from '@/utils/date-key';
import { localDateKey } from '@/utils/timezone';

export type ScheduleInput = Pick<LifeGoal,
  'checkinFrequency' | 'checkinFromDate' | 'checkinWeekday' | 'startDate' | 'dueDate'>;

export interface DueCheckin {
  dueDate: string;
  overdue: boolean;
  /** Number of OTHER pending scheduled dates, excluding dueDate itself. */
  pendingCount: number;
}

/** Pure calendar math, no DB writes or cron; YYYY-MM-DD comparisons are lexical. */
export function pendingForSchedule(
  goal: ScheduleInput, today: string, completedDates: ReadonlySet<string>,
): DueCheckin | null {
  const frequency = goal.checkinFrequency;
  if ((frequency !== 'weekly' && frequency !== 'daily') || !goal.checkinFromDate) return null;
  const start = goal.startDate && goal.startDate > goal.checkinFromDate
    ? goal.startDate : goal.checkinFromDate;
  const end = goal.dueDate && goal.dueDate < today ? goal.dueDate : today;
  if (start > end) return null;
  const weekly = frequency === 'weekly';
  if (weekly && (goal.checkinWeekday === null || goal.checkinWeekday < 1 || goal.checkinWeekday > 7)) return null;
  const first = weekly
    ? addDays(start, (goal.checkinWeekday! - isoWeekday(start) + 7) % 7)
    : start;
  if (first > end) return null;
  const step = weekly ? 7 : 1;
  const total = Math.floor((daysBetweenInclusive(first, end) - 1) / step) + 1;
  // Weekly completion is scoped to the ISO week, even after changing its weekday.
  // This prevents a second check-in for the same weekly period after rescheduling.
  const closedPeriods = weekly
    ? new Set([...completedDates].map(mondayOf)) : completedDates;
  const done = (date: string) => closedPeriods.has(weekly ? mondayOf(date) : date);
  const alreadyCompleted = [...completedDates].filter(date => {
    if (weekly) return mondayOf(date) >= mondayOf(first) && mondayOf(date) <= mondayOf(end);
    return date >= first && date <= end;
  });
  const completedCount = weekly ? new Set(alreadyCompleted.map(mondayOf)).size : alreadyCompleted.length;
  const remaining = total - completedCount;
  if (remaining <= 0) return null;
  let date = first;
  while (done(date)) date = addDays(date, step);
  return { dueDate: date, overdue: date < today, pendingCount: remaining - 1 };
}

@Injectable()
export class CheckinScheduleService {
  today(timezone: string): string { return localDateKey(timezone); }
  pending(goal: ScheduleInput, today: string, completed: ReadonlySet<string>): DueCheckin | null {
    return pendingForSchedule(goal, today, completed);
  }
}
