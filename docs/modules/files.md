# files — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Загрузка JPEG/PNG/WebP до 5 МиБ, доступ к собственным медиа и удаление с отложенной очисткой после сбоя S3.

Исходники: [модуль](../../src/files/files.module.ts), [сервис/контроллер](../../src/files/files.service.ts).

## Публичные сервисы и функции

- `upload(userId: string, file: Express.Multer.File \| undefined): Promise<FileResponseDto>` — входные параметры и результат из TS-сигнатуры.
- `getMetadata(userId: string, id: string): Promise<FileResponseDto>` — входные параметры и результат из TS-сигнатуры.
- `getContent(userId: string, id: string): Promise<StreamableFile>` — входные параметры и результат из TS-сигнатуры.
- `remove(userId: string, id: string): Promise<void>` — входные параметры и результат из TS-сигнатуры.
- `cleanupPending(limit = 100): Promise<number>` — входные параметры и результат из TS-сигнатуры.

## Модели и схемы данных, связи

StoredFile.userId → User, soft-delete хранит tombstone до удаления объекта; S3 key содержит идентификатор владельца.

Сущность [`stored-file.entity.ts`](../../src/files/entities/stored-file.entity.ts):

| Поле | Тип |
|---|---|
| `id` | `string` |
| `userId` | `string` |
| `storageKey` | `string` |
| `originalName` | `string` |
| `mimeType` | `string` |
| `size` | `number` |
| `createdAt` | `Date` |
| `deletedAt` | `Date \| null` |

## Зависимости от других модулей

`storage`; NestJS. Для сохраняемых данных используется PostgreSQL, для объектов — S3, если применимо.

## Конфигурация и переменные окружения

`S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`. Значения и обязательность — [README, конфигурация ENV](../../README.md#конфигурация-env).

## Обработка ошибок

Единый HTTP-контракт `{ statusCode, code, message }`; общее правило `401` для приватных маршрутов, `400` для DTO и `404` для отсутствующих/чужих ID. Выявленные исключения: `NotFoundException`, `ServiceUnavailableException`.

## Пример использования

```bash
curl -i -b cookies.txt -F 'file=@photo.png' http://localhost:3000/api/v1/files
```

[Общий API Reference](../../README.md#api-reference).
