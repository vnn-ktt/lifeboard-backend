import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from '@/app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    whitelist: true,
    forbidNonWhitelisted: true,
    stopAtFirstError: true,
    validationError: { target: false, value: false },
  }));
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Lifeboard REST API')
    .setDescription('Private session-based Lifeboard API. Authentication requires a lifeboard.sid cookie.')
    .setVersion('0.6.1')
    .addCookieAuth('lifeboard.sid', { type: 'apiKey', in: 'cookie', name: 'lifeboard.sid' }, 'lifeboard.sid')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig), {
    jsonDocumentUrl: 'api/docs-json',
  });

  const config = app.get(ConfigService);
  const webOrigin = config.getOrThrow<string>('WEB_ORIGIN');
  app.enableCors({ origin: webOrigin, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] });

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
