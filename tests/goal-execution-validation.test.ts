import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMilestoneDto } from '@/milestones/dto/create-milestone.dto';
import { UpdateMilestoneDto } from '@/milestones/dto/update-milestone.dto';
import { CreateTaskDto } from '@/tasks/dto/create-task.dto';
import { SetCompletionDto } from '@/goals/dto/set-completion.dto';
import { UpdateGoalStatusDto } from '@/goal-status/dto/update-goal-status.dto';
import { StatusEventsQueryDto } from '@/goal-status/dto/status-events-query.dto';
import { validGoalMeasurement, normalizeGoalMeasurement, presentGoalMeasurement } from '@/goals/domain/goal-measurement';
import { decodeStatusCursor, encodeStatusCursor } from '@/goal-status/domain/status-cursor';

const validId = 'd6fdb10e-59ef-4a6d-b85d-f80a120aa1d7';
async function errors<T extends object>(cls: new() => T, input: object) {
  return validate(plainToInstance(cls, input), { whitelist: true, forbidNonWhitelisted: true });
}

test('milestone DTO validates order, title and real calendar day', async () => {
  assert.equal((await errors(CreateMilestoneDto, { title: 'MVP ready', order: 0, dueDate: '2026-12-01' })).length, 0);
  assert.ok((await errors(CreateMilestoneDto, { title: 'a', order: -1, dueDate: '2026-02-30' })).length >= 2);
  assert.ok((await errors(CreateMilestoneDto, { title: 'Good', order: 10001 })).length > 0);
  assert.equal((await errors(UpdateMilestoneDto, { dueDate: null })).length, 0);
});
test('task DTO rejects cross-shape values and malformed UUID', async () => {
  assert.equal((await errors(CreateTaskDto, { title: 'Draft plan', milestoneId: validId })).length, 0);
  assert.ok((await errors(CreateTaskDto, { title: 'Draft plan', milestoneId: 'dogs-goal' })).length > 0);
  assert.ok((await errors(CreateTaskDto, { title: 'a', dueDate: '2026-13-01' })).length > 0);
  assert.ok((await errors(CreateTaskDto, { title: 'a valid title', surprise: true })).length > 0);
});
test('status and completion DTOs require correct types', async () => {
  assert.equal((await errors(UpdateGoalStatusDto, { status: 'paused' })).length, 0);
  assert.ok((await errors(UpdateGoalStatusDto, { status: 'archived' })).length > 0);
  assert.ok((await errors(SetCompletionDto, { completed: 'true' })).length > 0);
  assert.equal((await errors(SetCompletionDto, { completed: false })).length, 0);
});
test('status history cursor is roundtrippable and validates input', async () => {
  const key = { id: validId, changedAt: new Date('2026-11-08T12:30:00.000Z') };
  assert.deepEqual(decodeStatusCursor(encodeStatusCursor(key)), key);
  assert.throws(() => decodeStatusCursor('????'));
  assert.ok((await errors(StatusEventsQueryDto, { limit: '1000' })).length > 0);
  assert.equal((await errors(StatusEventsQueryDto, { limit: '12' })).length, 0);
});
test('v0.17.1 kind and legacy type both accepted without changing persisted shape', () => {
  const input = { kind: 'numeric', direction: 'increase', startValue: 0, targetValue: 10, unit: 'kg' } as const;
  assert.equal(validGoalMeasurement(input), true);
  const internal = normalizeGoalMeasurement(input);
  assert.deepEqual(internal, { type: 'numeric', direction: 'increase', startValue: 0, targetValue: 10, unit: 'kg' });
  assert.deepEqual(presentGoalMeasurement(internal), { ...internal, kind: 'numeric' });
  assert.equal(validGoalMeasurement({ type: 'binary' }), true);
  assert.equal(validGoalMeasurement({ kind: 'binary', type: 'binary' }), false);
});
