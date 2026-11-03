import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const webOrigin = config.getOrThrow<string>('WEB_ORIGIN');
  app.enableCors({ origin: webOrigin, credentials: true, methods: ['GET', 'POST', 'OPTIONS'] });

  // Cookie-based auth requires a CSRF defense. Browser cross-origin unsafe
  // requests are only accepted from our explicitly configured web origin.
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const origin = request.headers.origin;
      if ((origin && origin !== webOrigin) || (!origin && request.headers['sec-fetch-site'] === 'cross-site')) {
        response.status(403).json({ statusCode: 403, message: 'Forbidden origin' });
        return;
      }
    }
    next();
  });

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port, '0.0.0.0');
  Logger.log(`Lifeboard API ready on :${port}`, 'Bootstrap');
}

void bootstrap();
