import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { pendingForSchedule, ScheduleInput } from '@/goal-checkins/domain/checkin-schedule.service';
import { localDateKey, validIanaTimezone } from '@/utils/timezone';
import { goalOutcome } from '@/goal-metrics/domain/goal-outcome';

const schedule = (frequency: ScheduleInput['checkinFrequency'],
  fromDate = '2026-11-01', weekday: number | null = 7, extra: Partial<ScheduleInput> = {}): ScheduleInput =>
  ({ checkinFrequency: frequency, checkinFromDate: fromDate, checkinWeekday: weekday,
    startDate: null, dueDate: null, ...extra });
const due = (g: ScheduleInput, today: string, ...completed: string[]) =>
  pendingForSchedule(g, today, new Set(completed));

test('01: Sunday weekly schedule starts on the next Sunday', () => {
  assert.deepEqual(due(schedule('weekly', '2026-11-02'), '2026-11-08'),
    { dueDate: '2026-11-08', overdue: false, pendingCount: 0 });
  assert.equal(due(schedule('weekly', '2026-11-02'), '2026-11-07'), null);
});
test('02: selected weekday is ISO 1=Monday, 7=Sunday', () => {
  assert.equal(due(schedule('weekly', '2026-11-02', 3), '2026-11-04')?.dueDate, '2026-11-04');
});
test('03: daily schedule generates dates daily', () => {
  assert.deepEqual(due(schedule('daily', '2026-11-06', null), '2026-11-08'),
    { dueDate: '2026-11-06', overdue: true, pendingCount: 2 });
});
test('04: overdue from prior week remains in queue', () => {
  assert.deepEqual(due(schedule('weekly', '2026-11-01'), '2026-11-16'),
    { dueDate: '2026-11-01', overdue: true, pendingCount: 2 });
});
test('05: completing oldest reveals next date, leaves later dates counted', () => {
  assert.deepEqual(due(schedule('weekly', '2026-11-01'), '2026-11-22', '2026-11-01'),
    { dueDate: '2026-11-08', overdue: true, pendingCount: 2 });
});
test('06: completed period is omitted', () => {
  assert.equal(due(schedule('daily', '2026-11-06', null), '2026-11-06', '2026-11-06'), null);
});
test('07: manually disabled and off schedules never enqueue', () => {
  assert.equal(due(schedule('manual'), '2026-11-22'), null);
  assert.equal(due(schedule('off'), '2026-11-22'), null);
});
test('08: activation date/startDate and dueDate are inclusive limits', () => {
  const constrained = schedule('daily', '2026-11-01', null,
    { startDate: '2026-11-05', dueDate: '2026-11-06' });
  assert.deepEqual(due(constrained, '2026-11-10'),
    { dueDate: '2026-11-05', overdue: true, pendingCount: 1 });
});
test('09: changing weekday midweek does not duplicate a completed ISO week', () => {
  assert.equal(due(schedule('weekly', '2026-11-04', 4), '2026-11-05', '2026-11-02'), null);
});
test('10: schedule reset prevents old overdue dates', () => {
  assert.deepEqual(due(schedule('weekly', '2026-11-12'), '2026-11-15'),
    { dueDate: '2026-11-15', overdue: false, pendingCount: 0 });
});
test('11: account timezone changes the current date near midnight', () => {
  const instant = new Date('2026-11-07T23:30:00Z');
  assert.equal(localDateKey('Europe/Amsterdam', instant), '2026-11-08');
  assert.equal(localDateKey('America/New_York', instant), '2026-11-07');
  assert.equal(validIanaTimezone('Europe/Amsterdam'), true);
  assert.equal(validIanaTimezone('Not/A_Zone'), false);
});
test('12: DST start/end do not affect ISO calendar day spacing', () => {
  assert.equal(due(schedule('daily', '2026-03-28', null), '2026-03-30')?.pendingCount, 2);
  assert.equal(due(schedule('daily', '2026-10-24', null), '2026-10-26')?.pendingCount, 2);
});
test('13: numeric and binary completion depends on metric, not check-in status', () => {
  assert.equal(goalOutcome({ type: 'numeric', direction: 'increase', startValue: 20000,
    targetValue: 100000, unit: 'USD' }, 100000).completed, true);
  assert.equal(goalOutcome({ type: 'binary' }, 1).percent, 100);
  assert.equal(goalOutcome({ type: 'binary' }, null).percent, 0);
});
