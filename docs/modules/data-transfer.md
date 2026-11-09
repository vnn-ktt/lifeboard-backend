# data-transfer — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Проверка LifeState v1, одноразовый импорт legacy-ID и связей, консистентный экспорт; аудит SHA-256 и идемпотентность.

Исходники: [модуль](../../src/data-transfer/data-transfer.module.ts), [сервис/контроллер](../../src/data-transfer/data-transfer.service.ts).

## Публичные сервисы и функции

- `validate(userId: string, raw: unknown): Promise<ImportPreview>` — проверяет формат, ссылки и количество сущностей без записи; при ошибке выбрасывает `UnprocessableEntityException`.
- `import(userId: string, raw: unknown, idempotencyKey?: string): Promise<ImportResult>` — сохраняет допустимый снимок в транзакции с audit; `409` при непустом аккаунте/конфликте ключа, `422` при невалидной структуре, `503` при сбое хранилища.
- `export(userId: string): Promise<LifeStateV1>` — консистентно читает данные аккаунта и включённые изображения; `413` при превышении лимита, `503` при ошибке S3.

## Модели и схемы данных, связи

ImportAudit хранит пользовательский hash/idempotency key и idMap; ArchivedUserQuote сохраняет архивные цитаты. Импорт связан с Goals, Metrics, Check-ins, Routines, Tasks, Reviews, Notes, Files и системными цитатами.

Сущность [`import-audit.entity.ts`](../../src/data-transfer/entities/import-audit.entity.ts):

| Поле | Тип |
|---|---|
| `id` | `string` |
| `userId` | `string` |
| `snapshotHash` | `string` |
| `idempotencyKey` | `string` |
| `idMap` | `Record<string, Record<string,string>>` |
| `counts` | `Record<string,number>` |
| `createdAt` | `Date` |

См. также [archived-user-quote.entity.ts](../../src/data-transfer/entities/archived-user-quote.entity.ts) и миграцию `1794541200000-CreateDataTransfers.ts`.

## Зависимости от других модулей

`common`, `storage`; NestJS. Для сохраняемых данных используется PostgreSQL, для объектов — S3, если применимо.

## Конфигурация и переменные окружения

`DB_HOST`, `DB_NAME`, `S3_ENDPOINT`, `S3_BUCKET`. Значения и обязательность — [README, конфигурация ENV](../../README.md#конфигурация-env).

## Обработка ошибок

Единый HTTP-контракт `{ statusCode, code, message }`; общее правило `401` для приватных маршрутов, `400` для DTO и `404` для отсутствующих/чужих ID. Выявленные исключения: `UnprocessableEntityException`, `ServiceUnavailableException`, `PayloadTooLargeException`.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/exports/lifeboard-v1
```

[Общий API Reference](../../README.md#api-reference).
