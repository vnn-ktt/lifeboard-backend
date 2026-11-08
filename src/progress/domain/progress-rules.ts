import type { GoalHorizon } from '@/goals/entities/life-goal.entity';
import { addDays, fromUtcDate, isoWeekday, mondayOf } from '@/utils/date-key';
import type { LifeRoutine } from '@/routines/entities/life-routine.entity';
import { completionPercent } from '@/routines/domain/routine-rules';

/**
 * Port of frontend utils/goalProgress.ts. Important: 'five-years' begins
 * Jan 1 of the selected year and ends Jan 1 of year+5 (not a rolling 5 years).
 */
export function horizonBounds(horizon: GoalHorizon, at: string): { from: string; toExclusive: string } {
  const [year, oneBasedMonth] = at.split('-').map(Number);
  const month = oneBasedMonth - 1;
  const quarterMonth = Math.floor(month / 3) * 3;
  const from = horizon === 'month'
    ? fromUtcDate(new Date(Date.UTC(year, month, 1)))
    : horizon === 'quarter'
      ? fromUtcDate(new Date(Date.UTC(year, quarterMonth, 1)))
      : fromUtcDate(new Date(Date.UTC(year, 0, 1)));
  const toExclusive = horizon === 'month'
    ? fromUtcDate(new Date(Date.UTC(year, month + 1, 1)))
    : horizon === 'quarter'
      ? fromUtcDate(new Date(Date.UTC(year, quarterMonth + 3, 1)))
      : fromUtcDate(new Date(Date.UTC(year + (horizon === 'year' ? 1 : 5), 0, 1)));
  return { from, toExclusive };
}

/** Fixed goal dates take precedence when both bounds are provided; older goals retain their horizon period. */
export function goalPeriodBounds(
  goal: { horizon: GoalHorizon; startDate: string | null; dueDate: string | null }, at: string,
): { from: string; toExclusive: string } {
  return goal.startDate && goal.dueDate
    ? { from: goal.startDate, toExclusive: addDays(goal.dueDate, 1) }
    : horizonBounds(goal.horizon, at);
}

/** The first 7 dates of the ISO week containing date. */
export function weekDates(date: string): string[] {
  const monday = mondayOf(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function weeklyPlanStats(
  routines: readonly Pick<LifeRoutine, 'id' | 'days'>[],
  checks: ReadonlySet<string>,
  date: string,
): { weekStart: string; done: number; total: number; percent: number; days: Array<{ date: string; done: number; total: number; percent: number }> } {
  const dates = weekDates(date);
  const days = dates.map((current) => {
    const weekday = isoWeekday(current);
    const planned = routines.filter((routine) => routine.days.includes(weekday));
    const done = planned.filter((routine) => checks.has(`${current}|${routine.id}`)).length;
    const total = planned.length;
    return { date: current, done, total, percent: completionPercent(done, total) };
  });
  const done = days.reduce((sum, day) => sum + day.done, 0);
  const total = days.reduce((sum, day) => sum + day.total, 0);
  return { weekStart: dates[0], done, total, percent: completionPercent(done, total), days };
}

export function goalCompletionPercent(done: number, target: number): number {
  return Math.min(100, completionPercent(done, Math.max(1, target)));
}
