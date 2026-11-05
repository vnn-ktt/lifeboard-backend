import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ValidationPipe, type ArgumentMetadata } from '@nestjs/common';
import { SaveReviewDto } from '@/reviews/dto/save-review.dto';
import { ReviewRangeQueryDto } from '@/reviews/dto/review-range-query.dto';
import { isReviewRangeAllowed, reviewWeekStart } from '@/reviews/domain/review-rules';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: false },
});
function validate<T>(cls: new () => T, value: unknown, type: 'body' | 'query' = 'body'): Promise<T> {
  return pipe.transform(value, { type, metatype: cls } as ArgumentMetadata) as Promise<T>;
}

const body = { wins: 'Finished MVP', obstacles: 'Not enough time', nextStep: 'Plan earlier', mood: 7 };

test('review DTO matches the frontend, without trimming or coercion', async () => {
  const dto = await validate(SaveReviewDto, body);
  assert.deepEqual(JSON.parse(JSON.stringify(dto)), body);

  const empty = await validate(SaveReviewDto, { wins: '', obstacles: '', nextStep: '', mood: 1 });
  assert.equal(empty.wins, '');
  assert.equal(empty.mood, 1);
});

test('review DTO rejects wrong types, invalid mood and unknown fields', async () => {
  for (const invalid of [
    { mood: 0 }, { mood: 11 }, { mood: 7.5 }, { mood: '7' }, { mood: null },
    { wins: null }, { obstacles: 7 }, { nextStep: undefined },
    { wins: 'x'.repeat(1001) }, { obstacles: 'x'.repeat(1001) },
    { nextStep: 'x'.repeat(1001) }, { updatedAt: '2026-11-02T01:00:00Z' },
    { userId: 'somebody' }, { weekStart: '2026-11-02' },
  ]) {
    await assert.rejects(validate(SaveReviewDto, { ...body, ...invalid }), JSON.stringify(invalid));
  }
  assert.equal((await validate(SaveReviewDto, { ...body, wins: 'x'.repeat(1000) })).wins.length, 1000);
});

test('date query DTO requires two real calendar dates', async () => {
  await validate(ReviewRangeQueryDto, { from: '2026-11-01', to: '2026-11-30' }, 'query');
  for (const invalid of [
    { from: '2026-11-01' }, { to: '2026-11-30' },
    { from: '2026-02-29', to: '2026-03-01' },
    { from: '2026-11-01', to: '2026-13-01' },
    { from: '2026-11-01', to: '2026-11-30', orderBy: 'userId' },
  ]) {
    await assert.rejects(validate(ReviewRangeQueryDto, invalid, 'query'));
  }
});

test('weeks are Mondays even at year boundaries and across DST', () => {
  assert.equal(reviewWeekStart('2026-11-05'), '2026-11-02');
  assert.equal(reviewWeekStart('2026-11-08'), '2026-11-02');
  assert.equal(reviewWeekStart('2026-11-09'), '2026-11-09');
  assert.equal(reviewWeekStart('2027-01-01'), '2026-12-28');
  assert.equal(reviewWeekStart('2026-03-29'), '2026-03-23');
  assert.equal(reviewWeekStart('2026-10-25'), '2026-10-19');
});

test('review list never requests an unbounded range', () => {
  assert.equal(isReviewRangeAllowed('2026-11-01', '2026-11-30'), true);
  assert.equal(isReviewRangeAllowed('2028-01-01', '2028-12-31'), true);
  assert.equal(isReviewRangeAllowed('2026-11-06', '2026-11-05'), false);
  assert.equal(isReviewRangeAllowed('2026-01-01', '2027-01-02'), false);
});
