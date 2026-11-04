import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { CreateRoutineDto } from '@/routines/dto/create-routine.dto';
import { UpdateRoutineDto } from '@/routines/dto/update-routine.dto';
import { SetCheckDto } from '@/routines/dto/set-check.dto';
import { DateQueryDto } from '@/routines/dto/date-query.dto';
import { ChecksRangeQueryDto } from '@/routines/dto/checks-range-query.dto';
import { AtQueryDto } from '@/progress/dto/at-query.dto';
import { ParseDateKeyPipe } from '@/common/pipes/parse-date-key.pipe';
import { isChecksRangeAllowed } from '@/routines/domain/routine-rules';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: false },
});
function validate<T>(cls: new () => T, value: unknown): Promise<T> {
  return pipe.transform(value, { type: 'body', metatype: cls } as ArgumentMetadata) as Promise<T>;
}
const goalId = 'b7bc203b-9646-4433-bcf2-824a4b0e956c';
const routine = {
  goalId,
  title: ' Walk dogs ',
  description: ' Morning stroll ',
  time: '07:25',
  days: [1, 2, 3, 4, 5, 6, 7],
  durationMinutes: 40,
};

test('routine DTO keeps frontend shape and trims text', async () => {
  const result = await validate(CreateRoutineDto, routine);
  assert.equal(result.title, 'Walk dogs');
  assert.equal(result.description, 'Morning stroll');
  assert.deepEqual(result.days, [1, 2, 3, 4, 5, 6, 7]);
});

test('routines reject invalid input instead of coercing it', async () => {
  for (const bad of [
    { days: [] }, { days: [0] }, { days: [8] }, { days: [1, 1] },
    { days: ['1'] }, { time: '25:00' }, { time: '07:60' },
    { time: '7:25' }, { durationMinutes: 0 }, { durationMinutes: 1441 },
    { durationMinutes: '40' }, { title: '' }, { goalId: 'demo-goal' },
    { forbidden: true },
  ]) {
    await assert.rejects(validate(CreateRoutineDto, { ...routine, ...bad }), JSON.stringify(bad));
  }
});

test('PATCH allows real partial updates but rejects null and unknown fields', async () => {
  assert.equal((await validate(UpdateRoutineDto, { title: ' Better ' })).title, 'Better');
  await assert.rejects(validate(UpdateRoutineDto, { days: null }));
  await assert.rejects(validate(UpdateRoutineDto, { durationMinutes: null }));
  await assert.rejects(validate(UpdateRoutineDto, { isAdmin: true }));
});

test('checkbox accepts only JSON boolean', async () => {
  assert.equal((await validate(SetCheckDto, { done: false })).done, false);
  assert.equal((await validate(SetCheckDto, { done: true })).done, true);
  await assert.rejects(validate(SetCheckDto, { done: 'true' }));
  await assert.rejects(validate(SetCheckDto, { done: 1 }));
});

test('date query and path validate a real calendar date', async () => {
  const parse = new ParseDateKeyPipe();
  assert.equal(parse.transform('2026-02-28'), '2026-02-28');
  assert.equal(parse.transform('2028-02-29'), '2028-02-29');
  for (const invalid of ['2026-02-29', '2026-13-01', '2026-11-31', '2026-1-02', '2026-01-01T00:00:00Z']) {
    assert.throws(() => parse.transform(invalid), invalid);
    await assert.rejects(validate(DateQueryDto, { date: invalid }), invalid);
    await assert.rejects(validate(AtQueryDto, { at: invalid }), invalid);
  }
  await assert.rejects(validate(ChecksRangeQueryDto, { from: '2026-11-01' }));
  await validate(ChecksRangeQueryDto, { from: '2026-11-01', to: '2026-11-30' });
});

test('range boundaries restrict check history to 366 days', () => {
  assert.equal(isChecksRangeAllowed('2026-01-01', '2026-12-31'), true);
  assert.equal(isChecksRangeAllowed('2028-01-01', '2028-12-31'), true); // leap year
  assert.equal(isChecksRangeAllowed('2026-12-31', '2026-01-01'), false);
  assert.equal(isChecksRangeAllowed('2026-01-01', '2027-01-02'), false);
});
