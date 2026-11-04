import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from '@/auth/lib/password';
import { createSessionToken, hashSessionToken, readSessionCookie, SESSION_COOKIE } from '@/auth/lib/cookie';

test('scrypt: correct and incorrect passwords', async () => {
  const hash = await hashPassword('this is a strong passphrase');
  assert.equal(await verifyPassword('this is a strong passphrase', hash), true);
  assert.equal(await verifyPassword('incorrect', hash), false);
  assert.equal(await verifyPassword('incorrect', 'bad-hash'), false);
  assert.equal(hash.includes('this is a strong passphrase'), false);
});

test('session token never persists as plaintext', () => {
  const token = createSessionToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(hashSessionToken(token).length, 64);
  assert.notEqual(hashSessionToken(token), token);
  assert.equal(readSessionCookie(`other=1; ${SESSION_COOKIE}=${token}`), token);
  assert.equal(readSessionCookie(`${SESSION_COOKIE}=${token}; ${SESSION_COOKIE}=${token}`), null);
});
