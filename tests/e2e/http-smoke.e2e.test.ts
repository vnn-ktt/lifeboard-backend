import { randomUUID } from 'node:crypto';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ApiExceptionFilter } from '@/common/filters/api-exception.filter';

test('HTTP smoke: health, auth guard, validation and real session', async () => {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  }));
  app.useGlobalFilters(new ApiExceptionFilter());
  try {
    await app.listen(0, '127.0.0.1');
    const port = (app.getHttpServer().address() as AddressInfo).port;
    const base = `http://127.0.0.1:${port}/api/v1`;
    const live = await fetch(`${base}/health/live`);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: 'ok' });

    const anonymous = await fetch(`${base}/goals`);
    assert.equal(anonymous.status, 401);
    const denied = await anonymous.json() as { code: string };
    assert.equal(denied.code, 'UNAUTHORIZED');

    const invalid = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid' }),
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json() as { code: string }).code, 'BAD_REQUEST');

    const email = `release-${randomUUID()}@example.test`;
    const registered = await fetch(`${base}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: 'Release QA', password: 'S3cure-Test-Password-947' }),
    });
    assert.equal(registered.status, 201);
    const cookie = registered.headers.get('set-cookie');
    assert.ok(cookie?.includes('lifeboard.sid='));
    const authorized = await fetch(`${base}/goals`, { headers: { Cookie: cookie!.split(';')[0] } });
    assert.equal(authorized.status, 200);
  } finally {
    await app.close();
  }
});
