import 'reflect-metadata';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { GoalCheckinsService } from '@/goal-checkins/goal-checkins.service';
import { CheckinScheduleService } from '@/goal-checkins/domain/checkin-schedule.service';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalCheckin } from '@/goal-checkins/entities/goal-checkin.entity';
import { GoalMetricEntry } from '@/goal-metrics/entities/goal-metric-entry.entity';
import { User } from '@/users/entities/user.entity';

const userId = '12a986b3-e0c6-4224-861c-3c97411cb299';
const goalId = 'b147ddcd-19c5-4719-a4be-8081df6c8235';

function fixture() {
  const goal = {
    id: goalId, userId, status: 'active', measurement: { type: 'numeric', direction: 'increase', unit: 'USD',
      startValue: 1000, targetValue: 10000 },
    checkinFrequency: 'daily', checkinFromDate: '2026-11-05', checkinWeekday: null,
    startDate: null, dueDate: null,
  } as LifeGoal;
  const checks: GoalCheckin[] = [];
  const metrics: GoalMetricEntry[] = [];
  let metricInserts = 0;
  const checkRepo = {
    findOneBy: async (filter: Partial<GoalCheckin>) => checks.find(c => c.goalId === filter.goalId && c.dueDate === filter.dueDate) ?? null,
    find: async () => checks,
    create: (data: any) => data,
    save: async (data: GoalCheckin) => { data.completedAt = new Date('2026-11-08T12:00:00Z'); checks.push(data); return data; },
  };
  const metricRepo = {
    find: async () => metrics.slice().reverse(),
    findOne: async () => metrics.length ? metrics[metrics.length - 1] : null,
    findOneBy: async (filter: Partial<GoalMetricEntry>) => metrics.find(m => m.id === filter.id) ?? null,
    create: (data: any) => data,
    save: async (data: GoalMetricEntry) => { metricInserts++; data.createdAt = new Date(); metrics.push(data); return data; },
  };
  const goalRepo = { findOneBy: async () => goal, find: async () => [goal] };
  const userRepo = { findOneByOrFail: async () => ({ id: userId, timezone: 'UTC' }) };
  const manager = { getRepository: (entity: any): any =>
    entity === LifeGoal ? goalRepo
      : entity === User ? userRepo
        : entity === GoalCheckin ? checkRepo : metricRepo };
  const lock = { run: async (_userId: string, callback: (m: any) => Promise<any>) => callback(manager) };
  const schedule = new CheckinScheduleService();
  schedule.today = () => '2026-11-08';
  const service = new GoalCheckinsService(checkRepo as any, goalRepo as any, metricRepo as any, userRepo as any,
    lock as any, schedule);
  return { service, metrics, checks, get metricInserts() { return metricInserts; }, goal };
}

test('unchanged/skipped complete without creating any metric and idempotent retries', async () => {
  const f = fixture();
  const unchanged = { dueDate: '2026-11-05', status: 'unchanged' as const };
  const first = await f.service.complete(userId, goalId, unchanged);
  const again = await f.service.complete(userId, goalId, unchanged);
  assert.equal(first.id, again.id);
  await f.service.complete(userId, goalId, { dueDate: '2026-11-06', status: 'skipped' });
  assert.equal(f.metricInserts, 0);
  assert.equal(f.checks.length, 2);
});
test('updated creates one metric and check-in atomically using same mock transaction', async () => {
  const f = fixture();
  await f.service.complete(userId, goalId, { dueDate: '2026-11-05', status: 'unchanged' });
  const payload = { dueDate: '2026-11-06', status: 'updated' as const, value: 3500, note: 'Savings' };
  const result = await f.service.complete(userId, goalId, payload);
  assert.equal(f.metricInserts, 1);
  assert.equal(f.checks.length, 2);
  assert.equal(result.metricEntryId, f.metrics[0].id);
  const repeated = await f.service.complete(userId, goalId, payload);
  assert.equal(repeated.id, result.id);
  assert.equal(f.metricInserts, 1);
  await assert.rejects(f.service.complete(userId, goalId, { ...payload, value: 4000 }),
    (error: any) => error.getStatus?.() === 409);
});
test('reject future, out-of-order, and invalid unchanged value', async () => {
  const f = fixture();
  await assert.rejects(f.service.complete(userId, goalId, { dueDate: '2026-11-09', status: 'skipped' }),
    (error: any) => error.getStatus?.() === 400);
  await assert.rejects(f.service.complete(userId, goalId, { dueDate: '2026-11-07', status: 'skipped' }),
    (error: any) => error.getStatus?.() === 409);
  await assert.rejects(f.service.complete(userId, goalId, { dueDate: '2026-11-05', status: 'unchanged', value: 1 }),
    (error: any) => error.getStatus?.() === 400);
  assert.equal(f.checks.length, 0);
});

test('completed numeric goal has no due check-in; result regression reopens reminders', async () => {
  const f = fixture();
  f.metrics.push({ id: 'f9e5d188-b043-40c5-af41-d91e18b18ec5', goalId, userId,
    date: '2026-11-08', value: 10000, createdAt: new Date(), note: null } as GoalMetricEntry);
  assert.deepEqual(await f.service.due(userId), []);
  f.metrics.push({ id: '8f0561f4-5525-475d-9369-9c2433319258', goalId, userId,
    date: '2026-11-08', value: 9000, createdAt: new Date(), note: null } as GoalMetricEntry);
  assert.equal((await f.service.due(userId))[0].dueDate, '2026-11-05');
});
