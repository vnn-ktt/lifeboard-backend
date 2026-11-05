import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { WeeklyReview } from '@/reviews/entities/weekly-review.entity';
import { ReviewsService } from '@/reviews/reviews.service';

const userA = 'c76e1c4a-7a37-4876-8c64-11fba490663b';
const userB = '6a8ff1c8-8266-4fd7-b6c2-d311cd7830b9';
const content = { wins: 'Good week', obstacles: 'Meetings', nextStep: 'Improve scheduling', mood: 8 };

function repositoryStub(): Repository<WeeklyReview> {
  const store = new Map<string, WeeklyReview>();
  const key = (userId: string, weekStart: string) => `${userId}|${weekStart}`;
  const repository = {
    async upsert(value: WeeklyReview, columns: string[]) {
      assert.deepEqual(columns, ['userId', 'weekStart']);
      const old = store.get(key(value.userId, value.weekStart));
      store.set(key(value.userId, value.weekStart), {
        ...old, ...value, updatedAt: new Date('2026-11-05T00:00:00.000Z'),
      });
    },
    async findOneBy({ userId, weekStart }: { userId: string; weekStart: string }) {
      return store.get(key(userId, weekStart)) ?? null;
    },
    async findOneByOrFail({ userId, weekStart }: { userId: string; weekStart: string }) {
      const value = store.get(key(userId, weekStart));
      if (!value) throw new Error('not found');
      return value;
    },
    async delete({ userId, weekStart }: { userId: string; weekStart: string }) {
      store.delete(key(userId, weekStart));
    },
    createQueryBuilder() {
      const params: { userId?: string; from?: string; to?: string } = {};
      const builder = {
        where(_sql: string, input: { userId: string }) {
          params.userId = input.userId;
          return builder;
        },
        andWhere(_sql: string, input: { from: string; to: string }) {
          params.from = input.from;
          params.to = input.to;
          return builder;
        },
        orderBy() { return builder; },
        async getMany() {
          return [...store.values()].filter((r) => r.userId === params.userId &&
            r.weekStart >= params.from! && r.weekStart <= params.to!)
            .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
        },
      };
      return builder;
    },
  };
  return repository as unknown as Repository<WeeklyReview>;
}

test('one review per user/week; PUT overwrites without creating duplicates', async () => {
  const service = new ReviewsService(repositoryStub());
  const saved = await service.save(userA, '2026-11-05', content);
  assert.equal(saved.weekStart, '2026-11-02');
  assert.equal(saved.mood, 8);
  assert.equal(saved.updatedAt, '2026-11-05T00:00:00.000Z');
  const updated = await service.save(userA, '2026-11-08', { ...content, mood: 9 });
  assert.equal(updated.mood, 9);
  assert.equal((await service.list(userA, '2026-11-01', '2026-11-30')).length, 1);
});

test('two users remain fully isolated when using the same week', async () => {
  const service = new ReviewsService(repositoryStub());
  await service.save(userA, '2026-11-05', content);
  await assert.rejects(service.get(userB, '2026-11-05'), NotFoundException);
  await service.save(userB, '2026-11-06', { ...content, mood: 4 });
  assert.equal((await service.get(userA, '2026-11-05')).mood, 8);
  assert.equal((await service.get(userB, '2026-11-05')).mood, 4);
  assert.equal((await service.list(userB, '2026-11-01', '2026-11-30')).length, 1);
  await service.remove(userB, '2026-11-05');
  await service.remove(userB, '2026-11-05');
  await assert.rejects(service.get(userB, '2026-11-05'), NotFoundException);
  assert.equal((await service.get(userA, '2026-11-05')).mood, 8);
});

test('GET history includes overlapping boundary week and orders newest first', async () => {
  const service = new ReviewsService(repositoryStub());
  await service.save(userA, '2026-10-30', content); // Monday = 2026-10-26
  await service.save(userA, '2026-11-03', content); // Monday = 2026-11-02
  await service.save(userA, '2026-12-01', content); // Monday = 2026-11-30
  const rows = await service.list(userA, '2026-11-01', '2026-11-30');
  assert.deepEqual(rows.map((row) => row.weekStart), ['2026-11-30', '2026-11-02', '2026-10-26']);
  await assert.rejects(service.list(userA, '2026-01-01', '2027-12-31'));
});
