import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { parseLoginInput, parseRegisterInput } from '../src/auth/auth.dto';

test('register accepts a normalized valid input', () => {
  const result = parseRegisterInput({ name: ' Ivan ', nickname: ' @ivan ', email: ' Ivan@Example.com ', password: 'a very long password' });
  assert.equal(result.email, 'ivan@example.com');
  assert.equal(result.name, 'Ivan');
  assert.equal(result.nickname, 'ivan');
});

test('register rejects short password and invalid nickname', () => {
  assert.throws(() => parseRegisterInput({ name: 'Ivan', email: 'ivan@example.com', password: 'short' }));
  assert.throws(() => parseRegisterInput({ name: 'Ivan', nickname: 'x!', email: 'ivan@example.com', password: 'valid password long' }));
});

test('login rejects non-object payload', () => {
  assert.throws(() => parseLoginInput(null));
});
