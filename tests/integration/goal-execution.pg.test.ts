import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { DataSource } from 'typeorm';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { User } from '@/users/entities/user.entity';
import { GoalMilestone } from '@/milestones/entities/goal-milestone.entity';
import { GoalTask } from '@/tasks/entities/goal-task.entity';
import { GoalStatusEvent } from '@/goal-status/entities/goal-status-event.entity';
import { GoalStatusService } from '@/goal-status/goal-status.service';
import { MilestonesService } from '@/milestones/milestones.service';
import { TasksService } from '@/tasks/tasks.service';
import { UserWriteLock } from '@/common/user-write-lock/user-write-lock.service';

const dbName = process.env.TEST_DB_NAME;
if (!dbName || !dbName.endsWith('_test') || dbName === process.env.DB_NAME) {
  throw new Error('Set TEST_DB_NAME to a dedicated PostgreSQL database ending _test, different from DB_NAME');
}

test('Goal execution: migrations, ownership, cascade, task detach, status atomicity', async () => {
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER, password: process.env.DB_PASSWORD, database: dbName,
    entities: ['src/**/*.entity.ts'], migrations: ['src/database/migrations/*.ts'],
    migrationsTableName: 'typeorm_migrations', synchronize: false,
  });
  const alice = randomUUID(), bob = randomUUID(), goalId = randomUUID();
  await ds.initialize();
  try {
    await ds.runMigrations();
    const userRepo = ds.getRepository(User);
    for (const id of [alice, bob]) {
      await userRepo.insert({ id, email: `${id}@example.org`, name: 'Test user', nickname: null,
        about: '', timezone: 'UTC', passwordHash: 'integration-no-login' });
    }
    const goalRepo = ds.getRepository(LifeGoal);
    await goalRepo.insert({ id: goalId, userId: alice, areaId: 'career', title: 'Deploy MVP',
      description: '', horizon: 'year', target: 10, parentId: null, focusPosition: null,
      status: 'active', completedAt: null, measurement: { type: 'activity' },
      startDate: null, dueDate: null, checkinFrequency: null, checkinWeekday: null, checkinFromDate: null });

    const lock = new UserWriteLock(ds);
    const milestones = new MilestonesService(goalRepo, ds.getRepository(GoalMilestone), lock);
    const tasks = new TasksService(goalRepo, ds.getRepository(GoalTask), lock);
    const statuses = new GoalStatusService(goalRepo, ds.getRepository(GoalStatusEvent), lock);

    const stage = await milestones.create(alice, goalId, { title: 'First release', order: 0, dueDate: '2026-12-01' });
    const task = await tasks.create(alice, goalId, { title: 'Run smoke tests', milestoneId: stage.id, dueDate: '2026-11-08' });
    assert.equal(task.milestoneId, stage.id);
    assert.equal((await tasks.due(alice, '2026-11-08')).some(item => item.id === task.id), true);
    await assert.rejects(tasks.list(bob, goalId), (e: any) => e.getStatus?.() === 404);
    await assert.rejects(tasks.create(bob, goalId, { title: 'Untrusted', milestoneId: stage.id }),
      (e: any) => e.getStatus?.() === 404);
    await assert.rejects(tasks.create(alice, goalId, { title: 'Bad milestone', milestoneId: randomUUID() }),
      (e: any) => e.getStatus?.() === 404);

    const paused = await statuses.change(alice, goalId, 'paused');
    assert.equal(paused.status, 'paused');
    assert.equal((await tasks.due(alice, '2026-11-08')).length, 0);
    await statuses.change(alice, goalId, 'paused');
    assert.equal(await ds.getRepository(GoalStatusEvent).countBy({ goalId }), 1);
    assert.equal((await statuses.history(alice, goalId)).items[0].status, 'paused');
    await assert.rejects(statuses.history(bob, goalId), (e: any) => e.getStatus?.() === 404);
    await statuses.change(alice, goalId, 'active');
    const page = await statuses.history(alice, goalId, undefined, 1);
    assert.equal(page.items.length, 1);
    assert.ok(page.nextCursor);
    assert.equal((await statuses.history(alice, goalId, page.nextCursor!, 1)).items.length, 1);

    // An INSERT failure after status UPDATE must roll both back in one transaction.
    await ds.query(`ALTER TABLE "goal_status_events" ADD CONSTRAINT "ck_integration_event"
      CHECK ("status" <> 'cancelled')`);
    try {
      await assert.rejects(statuses.change(alice, goalId, 'cancelled'));
      assert.equal((await goalRepo.findOneByOrFail({ id: goalId })).status, 'active');
      assert.equal(await ds.getRepository(GoalStatusEvent).countBy({ goalId }), 2);
    } finally {
      await ds.query(`ALTER TABLE "goal_status_events" DROP CONSTRAINT "ck_integration_event"`);
    }

    await milestones.remove(alice, goalId, stage.id);
    const detached = await ds.getRepository(GoalTask).findOneByOrFail({ id: task.id });
    assert.equal(detached.milestoneId, null);
    await goalRepo.delete({ id: goalId, userId: alice });
    assert.equal(await ds.getRepository(GoalTask).countBy({ goalId }), 0);
    assert.equal(await ds.getRepository(GoalMilestone).countBy({ goalId }), 0);
    assert.equal(await ds.getRepository(GoalStatusEvent).countBy({ goalId }), 0);
  } finally {
    await ds.getRepository(User).delete([{ id: alice }, { id: bob }]).catch(() => undefined);
    await ds.destroy();
  }
});
