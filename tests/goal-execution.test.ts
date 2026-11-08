import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { LifeGoal } from '@/goals/entities/life-goal.entity';
import { GoalStatusEvent } from '@/goal-status/entities/goal-status-event.entity';
import { GoalStatusService } from '@/goal-status/goal-status.service';
import { GoalMilestone } from '@/milestones/entities/goal-milestone.entity';
import { GoalTask } from '@/tasks/entities/goal-task.entity';
import { MilestonesService } from '@/milestones/milestones.service';
import { TasksService } from '@/tasks/tasks.service';
import { User } from '@/users/entities/user.entity';

const alice = randomUUID(), bob = randomUUID(), goalId = randomUUID();
function fixture() {
  const goal = { id: goalId, userId: alice, areaId: 'career', status: 'active', completedAt: null,
    title: 'MVP', description: '', horizon: 'year', target: 12,
    measurement: { type: 'activity' }, checkinFrequency: null, checkinFromDate: null,
    checkinWeekday: null, createdAt: new Date('2026-11-01T00:00:00Z') } as unknown as LifeGoal;
  const milestones: GoalMilestone[] = [], tasks: GoalTask[] = [], events: GoalStatusEvent[] = [];
  const goalRepo = {
    findOneBy: async (filter: Partial<LifeGoal>) => filter.id === goalId && filter.userId === alice ? goal : null,
    existsBy: async (filter: Partial<LifeGoal>) => filter.id === goalId && filter.userId === alice,
    save: async (item: LifeGoal) => item,
  };
  const milestoneRepo = {
    existsBy: async (f: Partial<GoalMilestone>) => milestones.some(x => x.id === f.id && x.goalId === f.goalId && x.userId === f.userId),
    findOneBy: async (f: Partial<GoalMilestone>) => milestones.find(x => x.id === f.id && x.goalId === f.goalId && x.userId === f.userId) ?? null,
    find: async () => milestones,
    create: (item: GoalMilestone) => item,
    save: async (item: GoalMilestone) => { item.createdAt ??= new Date(); if (!milestones.includes(item)) milestones.push(item); return item; },
    delete: async (f: Partial<GoalMilestone>) => {
      const ix = milestones.findIndex(x => x.id === f.id && x.goalId === f.goalId && x.userId === f.userId);
      if (ix < 0) return { affected: 0 };
      const [item] = milestones.splice(ix, 1);
      tasks.filter(t => t.milestoneId === item.id).forEach(t => { t.milestoneId = null; });
      return { affected: 1 };
    },
  };
  const taskRepo = {
    findOneBy: async (f: Partial<GoalTask>) => tasks.find(x => x.id === f.id && x.goalId === f.goalId && x.userId === f.userId) ?? null,
    find: async () => tasks,
    create: (item: GoalTask) => item,
    save: async (item: GoalTask) => { item.createdAt ??= new Date(); if (!tasks.includes(item)) tasks.push(item); return item; },
    delete: async (f: Partial<GoalTask>) => {
      const ix = tasks.findIndex(x => x.id === f.id && x.goalId === f.goalId && x.userId === f.userId);
      if (ix < 0) return { affected: 0 };
      tasks.splice(ix, 1); return { affected: 1 };
    },
  };
  const eventRepo = { insert: async (event: GoalStatusEvent) => { events.push(event); } };
  const userRepo = { findOneByOrFail: async () => ({ timezone: 'UTC' }) };
  const manager = { getRepository: (entity: unknown) => entity === LifeGoal ? goalRepo
    : entity === GoalMilestone ? milestoneRepo : entity === GoalTask ? taskRepo
      : entity === GoalStatusEvent ? eventRepo : entity === User ? userRepo : null };
  const lock = { run: async (_id: string, cb: (manager: any) => Promise<unknown>) => cb(manager) };
  return { goal, tasks, milestones, events,
    statuses: new GoalStatusService(goalRepo as any, eventRepo as any, lock as any),
    milestonesApi: new MilestonesService(goalRepo as any, milestoneRepo as any, lock as any),
    tasksApi: new TasksService(goalRepo as any, taskRepo as any, lock as any) };
}

test('real status transitions produce events, same-state retry does not', async () => {
  const f = fixture();
  const changed = await f.statuses.change(alice, goalId, 'completed');
  assert.equal(changed.status, 'completed');
  assert.ok(changed.completedAt);
  const at = changed.completedAt;
  assert.equal(f.events.length, 1);
  assert.equal((await f.statuses.change(alice, goalId, 'completed')).completedAt, at);
  assert.equal(f.events.length, 1);
  const restored = await f.statuses.change(alice, goalId, 'active');
  assert.equal(restored.completedAt, null);
  assert.equal(f.events.length, 2);
  await assert.rejects(f.statuses.change(bob, goalId, 'cancelled'), (e: any) => e.getStatus?.() === 404);
  assert.equal(f.events.length, 2);
});

test('milestones completion idempotency and deletion detaches, never deletes tasks', async () => {
  const f = fixture();
  const m = await f.milestonesApi.create(alice, goalId, { title: 'Ready', order: 0 });
  const completed = await f.milestonesApi.complete(alice, goalId, m.id, true);
  assert.ok(completed.completedAt);
  assert.equal((await f.milestonesApi.complete(alice, goalId, m.id, true)).completedAt, completed.completedAt);
  const task = await f.tasksApi.create(alice, goalId, { title: 'Write deployment guide', milestoneId: m.id });
  assert.equal(task.milestoneId, m.id);
  await f.milestonesApi.remove(alice, goalId, m.id);
  assert.equal(f.tasks.length, 1);
  assert.equal(f.tasks[0].milestoneId, null);
  await assert.rejects(f.milestonesApi.remove(bob, goalId, m.id), (e: any) => e.getStatus?.() === 404);
});

test('tasks milestone ownership checks, completion and user isolation', async () => {
  const f = fixture();
  await assert.rejects(f.tasksApi.create(bob, goalId, { title: 'Cross account' }),
    (e: any) => e.getStatus?.() === 404);
  await assert.rejects(f.tasksApi.create(alice, goalId, { title: 'Bad milestone', milestoneId: randomUUID() }),
    (e: any) => e.getStatus?.() === 404);
  const task = await f.tasksApi.create(alice, goalId, { title: 'Implement timeline', dueDate: '2026-11-08' });
  const done = await f.tasksApi.complete(alice, goalId, task.id, true);
  assert.ok(done.completedAt);
  assert.equal((await f.tasksApi.complete(alice, goalId, task.id, true)).completedAt, done.completedAt);
  assert.equal((await f.tasksApi.complete(alice, goalId, task.id, false)).completedAt, null);
  await assert.rejects(f.tasksApi.update(bob, goalId, task.id, { title: 'Unauthorized' }),
    (e: any) => e.getStatus?.() === 404);
});
