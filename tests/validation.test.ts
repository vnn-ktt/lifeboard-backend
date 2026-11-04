import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { LoginDto } from '@/auth/dto/login.dto';
import { RegisterDto } from '@/auth/dto/register.dto';
import { NonEmptyBodyPipe } from '@/common/pipes/non-empty-body.pipe';
import { isBoolean, isRecord, isSafeInteger, isString } from '@/utils/type-guards';

const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
function dto<T>(target: new () => T, value: unknown): Promise<T> {
  return pipe.transform(value, { type: 'body', metatype: target } as ArgumentMetadata) as Promise<T>;
}

test('register trims name, nickname and normalizes email', async () => {
  const result = await dto(RegisterDto, {
    name: ' Ivan ', nickname: ' @ivan ', email: ' Ivan@Example.com ', password: 'a very long password',
  });
  assert.equal(result.name, 'Ivan');
  assert.equal(result.email, 'ivan@example.com');
  assert.equal(result.nickname, 'ivan');
});

test('register rejects short password, invalid nickname, and unknown fields', async () => {
  const input = { name: 'Ivan', email: 'ivan@example.com', password: 'valid password long' };
  await assert.rejects(dto(RegisterDto, { ...input, password: 'short' }));
  await assert.rejects(dto(RegisterDto, { ...input, nickname: 'x!' }));
  await assert.rejects(dto(RegisterDto, { ...input, role: 'admin' }));
});

test('login rejects missing credentials', async () => {
  await assert.rejects(dto(LoginDto, {}));
  await assert.rejects(dto(LoginDto, { email: 'broken', password: '123456789012' }));
});

test('PATCH body requires at least one property', () => {
  const nonEmpty = new NonEmptyBodyPipe();
  assert.throws(() => nonEmpty.transform({}));
  assert.throws(() => nonEmpty.transform({ title: undefined, areaId: undefined }));
  assert.deepEqual(nonEmpty.transform({ title: 'Hi' }), { title: 'Hi' });
});

test('shared primitive guards do not coerce values', () => {
  assert.equal(isString(1), false);
  assert.equal(isString('hi'), true);
  assert.equal(isBoolean('false'), false);
  assert.equal(isBoolean(false), true);
  assert.equal(isRecord([]), false);
  assert.equal(isRecord({ a: 1 }), true);
  assert.equal(isSafeInteger(1.5), false);
  assert.equal(isSafeInteger(2), true);
});
