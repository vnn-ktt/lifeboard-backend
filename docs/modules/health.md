# health — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Публичные liveness/readiness endpoints; readiness проверяет PostgreSQL запросом SELECT 1.

Исходники: [модуль](../../src/health/health.module.ts), [сервис/контроллер](../../src/health/health.controller.ts).

## Публичные сервисы и функции

- `live(): ` — входные параметры и результат из TS-сигнатуры.
- `ready(): Promise<` — входные параметры и результат из TS-сигнатуры.

## Модели и схемы данных, связи

Таблиц нет. Проверка "/health/ready" использует DataSource; "/health/live" не зависит от БД.

## Зависимости от других модулей

Нет импортов других предметных модулей; NestJS. Для сохраняемых данных используется PostgreSQL, для объектов — S3, если применимо.

## Конфигурация и переменные окружения

`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`. Значения и обязательность — [README, конфигурация ENV](../../README.md#конфигурация-env).

## Обработка ошибок

`/health/live` возвращает 200, `/health/ready` — 503 при недоступности PostgreSQL. Единый HTTP-контракт `{ statusCode, code, message }`; общее правило `401` для приватных маршрутов, `400` для DTO и `404` для отсутствующих/чужих ID. Выявленные исключения: `ServiceUnavailableException`.

## Пример использования

```bash
curl -i http://localhost:3000/api/v1/health/ready
```

[Общий API Reference](../../README.md#api-reference).
