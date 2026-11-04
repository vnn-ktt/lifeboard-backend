import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { CreateAreaDto } from '@/areas/dto/create-area.dto';
import { CreateGoalDto } from '@/goals/dto/create-goal.dto';
import { UpdateGoalDto } from '@/goals/dto/update-goal.dto';
import { SetFocusDto } from '@/goals/dto/set-focus.dto';
import { SetVisionDto } from '@/life/dto/set-vision.dto';
import { createsGoalCycle } from '@/goals/domain/goal-rules';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: false },
});

function dto<T>(target: new () => T, value: unknown): Promise<T> {
  return pipe.transform(value, { type: 'body', metatype: target } as ArgumentMetadata) as Promise<T>;
}

const goal = { areaId: 'career', title: 'Backend', description: '', horizon: 'month', target: 12 };
const first = 'a9fb0112-c7a9-48de-88a8-b305fb491f8f';
const second = 'd3906ae2-6a6d-40cb-8b85-26a5a216c0a1';
const third = 'ac9c8392-38bc-4d8b-a2ae-587fbafda459';

test('create goal keeps frontend shape and normalizes title', async () => {
  const result = await dto(CreateGoalDto, { ...goal, title: ' Backend ' });
  assert.equal(result.title, 'Backend');
  assert.equal(result.parentId, undefined); // Service defaults missing parent to null.
});

test('create goal rejects unrecognized fields, horizons, and unsafe targets', async () => {
  await assert.rejects(dto(CreateGoalDto, { ...goal, horizon: 'decade' }));
  await assert.rejects(dto(CreateGoalDto, { ...goal, target: 0 }));
  await assert.rejects(dto(CreateGoalDto, { ...goal, target: 1.5 }));
  await assert.rejects(dto(CreateGoalDto, { ...goal, target: '12' }));
  await assert.rejects(dto(CreateGoalDto, { ...goal, isAdmin: true }));
});

test('partial update rejects null regular fields but accepts clearing parent', async () => {
  const result = await dto(UpdateGoalDto, { parentId: null });
  assert.equal(result.parentId, null);
  await assert.rejects(dto(UpdateGoalDto, { title: null }));
});

test('focus allows 0–3 unique UUIDs', async () => {
  const result = await dto(SetFocusDto, { goalIds: [first, second] });
  assert.deepEqual(result.goalIds, [first, second]);
  await assert.rejects(dto(SetFocusDto, { goalIds: [first, first] }));
  await assert.rejects(dto(SetFocusDto, { goalIds: [first, second, third, first] }));
  await assert.rejects(dto(SetFocusDto, { goalIds: [123] }));
});

test('area names and hex colors are normalized', async () => {
  const result = await dto(CreateAreaDto, { name: ' Работа ', accent: '#ABCDEF' });
  assert.equal(result.name, 'Работа');
  assert.equal(result.accent, '#abcdef');
  await assert.rejects(dto(CreateAreaDto, { name: 'x' }));
  await assert.rejects(dto(CreateAreaDto, { name: 'Custom', accent: null }));
});

test('vision accepts empty text', async () => {
  const result = await dto(SetVisionDto, { vision: '  ' });
  assert.equal(result.vision, '');
});

test('goal cycle detection catches direct and indirect cycles', () => {
  const parents = new Map<string, string | null>([[first, null], [second, first], [third, second]]);
  assert.equal(createsGoalCycle(first, third, parents), true);
  assert.equal(createsGoalCycle(first, first, parents), true);
  assert.equal(createsGoalCycle(third, first, parents), false);
  assert.equal(createsGoalCycle(third, null, parents), false);
});
