import 'reflect-metadata';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ValidationPipe } from '@nestjs/common';
import { CreateGoalDto } from '@/goals/dto/create-goal.dto';
import { UpdateGoalDto } from '@/goals/dto/update-goal.dto';
import { CompleteCheckinDto } from '@/goal-checkins/dto/complete-checkin.dto';
import { CreateMetricEntryDto } from '@/goal-metrics/dto/create-metric-entry.dto';
import { UpdateTimezoneDto } from '@/users/dto/update-timezone.dto';

const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
function validate<T>(type: new () => T, body: unknown): Promise<T> {
  return pipe.transform(body, { type: 'body', metatype: type }) as Promise<T>;
}
const base = { areaId: 'career', title: 'Savings', description: '', horizon: 'year', target: 12 };
const numeric = { type: 'numeric', direction: 'increase', unit: 'USD', startValue: 1000, targetValue: 100000 };

test('measurement DTO validates discriminated numeric and no extraneous fields', async () => {
  await validate(CreateGoalDto, { ...base, measurement: numeric });
  await assert.rejects(validate(CreateGoalDto, { ...base, measurement: { ...numeric, hacked: true } }));
  await assert.rejects(validate(CreateGoalDto, { ...base, measurement: { ...numeric, targetValue: 500 } }));
});
test('weekly schedule requires valid weekday, date and no unknown property', async () => {
  const checkin = { frequency: 'weekly', weekday: 7, fromDate: '2026-11-06' };
  await validate(CreateGoalDto, { ...base, measurement: numeric, checkin });
  await assert.rejects(validate(CreateGoalDto, { ...base, checkin: { ...checkin, weekday: 8 } }));
  await assert.rejects(validate(CreateGoalDto, { ...base, checkin: { ...checkin, fromDate: '2026-02-30' } }));
  await assert.rejects(validate(CreateGoalDto, { ...base, checkin: { ...checkin, unexpected: 'x' } }));
});
test('check-in payload requires date, status, bounded value/note', async () => {
  await validate(CompleteCheckinDto, { dueDate: '2026-11-08', status: 'updated', value: 35000 });
  await validate(CompleteCheckinDto, { dueDate: '2026-11-08', status: 'unchanged' });
  await assert.rejects(validate(CompleteCheckinDto, { dueDate: '2026-13-08', status: 'unchanged' }));
  await assert.rejects(validate(CompleteCheckinDto, { dueDate: '2026-11-08', status: 'updated', value: '123' }));
  await assert.rejects(validate(CompleteCheckinDto, { dueDate: '2026-11-08', status: 'skipped', note: 'z'.repeat(301) }));
});
test('metric and timezone DTO validate malformed data', async () => {
  await validate(CreateMetricEntryDto, { date: '2026-11-06', value: 10.5 });
  await assert.rejects(validate(CreateMetricEntryDto, { date: '2026-11-06', value: Infinity }));
  await validate(UpdateGoalDto, { dueDate: null });
  await validate(UpdateTimezoneDto, { timezone: 'Asia/Tokyo' });
  await assert.rejects(validate(UpdateTimezoneDto, { timezone: 'Moon/Mars' }));
});
