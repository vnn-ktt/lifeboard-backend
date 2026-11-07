import 'reflect-metadata';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { User } from '@/users/entities/user.entity';
import { GoalMetricEntry } from '@/goal-metrics/entities/goal-metric-entry.entity';
import { GoalCheckin } from '@/goal-checkins/entities/goal-checkin.entity';
import { GoalCheckinsService } from '@/goal-checkins/goal-checkins.service';
import { CheckinScheduleService } from '@/goal-checkins/domain/checkin-schedule.service';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';

const name = process.env.TEST_DB_NAME;
if (!name || !name.endsWith('_test') || name === process.env.DB_NAME) {
  throw new Error('Set TEST_DB_NAME to an existing isolated PostgreSQL database ending _test, distinct from DB_NAME');
}

// An integration test uses REAL PostgreSQL migrations and transactions, never SQLite mocks.
test('Goal check-ins: PG transactions, uniqueness, ownership, delete rules', async () => {
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER, password: process.env.DB_PASSWORD, database: name,
    entities: ['src/**/*.entity.ts'], migrations: ['src/database/migrations/*.ts'],
    migrationsTableName: 'typeorm_migrations', synchronize: false,
  });
  const alice = randomUUID(), bob = randomUUID(), goalId = randomUUID();
  await ds.initialize();
  try {
    await ds.runMigrations();
    const users = ds.getRepository(User);
    for (const id of [alice, bob]) {
      await users.insert({ id, email: `${id}@example.org`, name: 'Test user', nickname: null,
        about: '', timezone: 'UTC', passwordHash: 'test-no-login' });
    }
    await ds.getRepository(LifeGoal).insert({ id: goalId, userId: alice, areaId: 'career',
      title: 'Savings', description: '', target: 12, horizon: 'year', parentId: null, focusPosition: null,
      startDate: null, dueDate: null, measurement: { type: 'numeric', direction: 'increase',
        startValue: 0, targetValue: 10000, unit: 'USD' },
      checkinFrequency: 'daily', checkinWeekday: null, checkinFromDate: '2026-11-05' });

    const clock = new CheckinScheduleService();
    clock.today = () => '2026-11-08';
    const svc = new GoalCheckinsService(ds.getRepository(GoalCheckin), ds.getRepository(LifeGoal),
      ds.getRepository(GoalMetricEntry), users, new UserWriteLock(ds), clock);
    assert.equal((await svc.due(alice))[0].pendingCount, 3);

    const unchanged = await svc.complete(alice, goalId, { dueDate: '2026-11-05', status: 'unchanged' });
    assert.equal(unchanged.status, 'unchanged');
    await svc.complete(alice, goalId, { dueDate: '2026-11-06', status: 'skipped' });
    assert.equal(await ds.getRepository(GoalMetricEntry).countBy({ goalId, userId: alice }), 0);

    const payload = { dueDate: '2026-11-07', status: 'updated' as const, value: 3500, note: 'Deposit' };
    const updated = await svc.complete(alice, goalId, payload);
    assert.ok(updated.metricEntryId);
    assert.equal((await svc.complete(alice, goalId, payload)).id, updated.id);
    assert.equal(await ds.getRepository(GoalMetricEntry).countBy({ goalId, userId: alice }), 1);
    await assert.rejects(svc.complete(alice, goalId, { ...payload, value: 4000 }),
      (error: any) => error.getStatus?.() === 409);
    await assert.rejects(svc.complete(alice, goalId, { dueDate: '2026-11-08', status: 'skipped', value: 1 }),
      (error: any) => error.getStatus?.() === 400);
    await assert.rejects(svc.history(bob, goalId), (error: any) => error.getStatus?.() === 404);
    await assert.rejects(svc.complete(bob, goalId, { dueDate: '2026-11-08', status: 'skipped' }),
      (error: any) => error.getStatus?.() === 404);

    // FK preserves check-in, nulls metricEntryId after a measurement is deleted.
    await ds.getRepository(GoalMetricEntry).delete({ id: updated.metricEntryId });
    const afterDelete = await ds.getRepository(GoalCheckin).findOneByOrFail({ id: updated.id });
    assert.equal(afterDelete.metricEntryId, null);
    assert.equal(afterDelete.status, 'updated');

    // Force a PostgreSQL insert failure AFTER the metric INSERT; TX must roll back both.
    await ds.query(`ALTER TABLE "goal_checkins" ADD CONSTRAINT "ck_integration_rollback"
      CHECK ("status" <> 'updated' OR "due_date" <> DATE '2026-11-08')`);
    try {
      await assert.rejects(svc.complete(alice, goalId, { dueDate: '2026-11-08', status: 'updated', value: 5000 }));
      assert.equal(await ds.getRepository(GoalMetricEntry).countBy({ goalId, userId: alice }), 0);
      assert.equal(await ds.getRepository(GoalCheckin).countBy({ goalId, userId: alice }), 3);
    } finally {
      await ds.query(`ALTER TABLE "goal_checkins" DROP CONSTRAINT "ck_integration_rollback"`);
    }
    await ds.getRepository(LifeGoal).delete({ id: goalId, userId: alice });
    assert.equal(await ds.getRepository(GoalCheckin).countBy({ goalId }), 0);
    assert.equal(await ds.getRepository(GoalMetricEntry).countBy({ goalId }), 0);
  } finally {
    await ds.getRepository(User).delete([{ id: alice }, { id: bob }]).catch(() => undefined);
    await ds.destroy();
  }
});
