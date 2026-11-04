import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { addDays, isDateKey, isoWeekday, mondayOf } from '@/utils/date-key';
import { goalCompletionPercent, horizonBounds, weekDates, weeklyPlanStats } from '@/progress/domain/progress-rules';

test('date-only arithmetic respects leap years and ISO week boundaries', () => {
  assert.equal(isDateKey('2028-02-29'), true);
  assert.equal(isDateKey('2026-02-29'), false);
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(isoWeekday('2026-11-08'), 7);
  assert.equal(mondayOf('2026-11-08'), '2026-11-02');
  assert.deepEqual(weekDates('2026-11-05'), [
    '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05',
    '2026-11-06', '2026-11-07', '2026-11-08',
  ]);
});

test('goal progress horizon boundaries exactly match existing frontend', () => {
  assert.deepEqual(horizonBounds('month', '2026-12-15'), { from: '2026-12-01', toExclusive: '2027-01-01' });
  assert.deepEqual(horizonBounds('quarter', '2026-05-05'), { from: '2026-04-01', toExclusive: '2026-07-01' });
  assert.deepEqual(horizonBounds('year', '2026-11-05'), { from: '2026-01-01', toExclusive: '2027-01-01' });
  assert.deepEqual(horizonBounds('five-years', '2026-11-05'), { from: '2026-01-01', toExclusive: '2031-01-01' });
  assert.equal(goalCompletionPercent(2, 3), 67);
  assert.equal(goalCompletionPercent(8, 3), 100);
});

test('weekly stats count only scheduled occurrences and allow undo', () => {
  const routines = [
    { id: 'daily', days: [1, 2, 3, 4, 5, 6, 7] },
    { id: 'weekday', days: [1, 2, 3, 4, 5] },
  ];
  const checked = new Set(['2026-11-02|daily', '2026-11-02|weekday', '2026-11-07|weekday']);
  const result = weeklyPlanStats(routines, checked, '2026-11-05');
  assert.equal(result.total, 12);
  assert.equal(result.done, 2); // Saturday weekday check is intentionally excluded.
  assert.equal(result.days[0].percent, 100);
  assert.equal(result.days[5].done, 0);
  assert.equal(result.percent, 17);
  checked.delete('2026-11-02|daily');
  assert.equal(weeklyPlanStats(routines, checked, '2026-11-05').done, 1);
});
