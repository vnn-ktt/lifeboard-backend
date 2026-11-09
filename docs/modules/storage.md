# storage — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Абстракция объектного S3-хранилища через интерфейс ObjectStorage и провайдер S3StorageProvider.

Исходники: [модуль](../../src/storage/storage.module.ts), [сервис/контроллер](../../src/storage/storage.service.ts).

## Публичные сервисы и функции

- `put(key: string, body: Buffer, mimeType: string): Promise<void>` — входные параметры и результат из TS-сигнатуры.
- `get(key: string): Promise<StoredObject>` — входные параметры и результат из TS-сигнатуры.
- `delete(key: string): Promise<void>` — входные параметры и результат из TS-сигнатуры.

## Модели и схемы данных, связи

Не владеет таблицами: ключи и контент хранятся в Bucket; метаданные файлов — в FilesModule.

## Зависимости от других модулей

Нет импортов других предметных модулей; NestJS. Для сохраняемых данных используется PostgreSQL, для объектов — S3, если применимо.

## Конфигурация и переменные окружения

`S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`. Значения и обязательность — [README, конфигурация ENV](../../README.md#конфигурация-env).

## Обработка ошибок

Единый HTTP-контракт `{ statusCode, code, message }`; общее правило `401` для приватных маршрутов, `400` для DTO и `404` для отсутствующих/чужих ID. Выявленные исключения: в сервисе нет явных исключений.

## Пример использования

```ts
import { StorageService } from '@/storage/storage.service';
const storage = app.get(StorageService);
await storage.put('users/<uuid>/images/<uuid>.png', imageBuffer, 'image/png');
```

[Общий API Reference](../../README.md#api-reference).
