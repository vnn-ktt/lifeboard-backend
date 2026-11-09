# data-transfer — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Проверка LifeState v1, одноразовый импорт legacy-ID и связей, консистентный экспорт; аудит SHA-256 и идемпотентность.

Исходники: [модуль](../../src/data-transfer/data-transfer.module.ts), [сервис/контроллер](../../src/data-transfer/data-transfer.service.ts).

## Публичные сервисы и функции

- `if(error instanceof SnapshotValidationError): тип выводится TypeScript` — входные параметры и результат из TS-сигнатуры.
- `for(const [kind,rows] of Object.entries(collections)): тип выводится TypeScript` — входные параметры и результат из TS-сигнатуры.
- `if(value === null \|\| value === undefined): тип выводится TypeScript` — входные параметры и результат из TS-сигнатуры.
- `if(!mapped): тип выводится TypeScript` — входные параметры и результат из TS-сигнатуры.
- `for(const entity of collections): тип выводится TypeScript` — входные параметры и результат из TS-сигнатуры.
- `if((await manager.getRepository(LifeArea).count({ where: { userId } })) > 0): тип выводится TypeScript` — входные параметры и результат из TS-сигнатуры.
- `if(!match): тип выводится TypeScript` — входные параметры и результат из TS-сигнатуры.
- `if(!type \|\| type !== match[1] \|\| buffer.length === 0 \|\| buffer.length > MAX_IMAGE_SIZE): тип выводится TypeScript` — входные параметры и результат из TS-сигнатуры.
- `validate(userId: string, raw: unknown): Promise<ImportPreview>` — входные параметры и результат из TS-сигнатуры.
- `import(userId: string, raw: unknown, idempotencyKey?: string): Promise<ImportResult>` — входные параметры и результат из TS-сигнатуры.
- `export(userId: string): Promise<LifeStateV1>` — входные параметры и результат из TS-сигнатуры.

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
