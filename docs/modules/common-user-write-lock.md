# common-user-write-lock — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Сериализация конкурентных пользовательских записей через PostgreSQL-строку User с pessimistic_write.

Исходники: [модуль](../../src/common/user-write-lock/user-write-lock.module.ts), [сервис/контроллер](../../src/common/user-write-lock/user-write-lock.service.ts).

## Публичные сервисы и функции

- `run(userId: string, callback: (manager: EntityManager) => Promise<T>): Promise<T>` — входные параметры и результат из TS-сигнатуры.

## Модели и схемы данных, связи

Не создаёт таблиц. Использует существующую users; не следует вызывать внутри уже открытой транзакции другого UserWriteLock.

## Зависимости от других модулей

Нет импортов других предметных модулей; NestJS. Для сохраняемых данных используется PostgreSQL, для объектов — S3, если применимо.

## Конфигурация и переменные окружения

`DB_HOST`, `DB_NAME`. Значения и обязательность — [README, конфигурация ENV](../../README.md#конфигурация-env).

## Обработка ошибок

Единый HTTP-контракт `{ statusCode, code, message }`; общее правило `401` для приватных маршрутов, `400` для DTO и `404` для отсутствующих/чужих ID. Выявленные исключения: в сервисе нет явных исключений.

## Пример использования

```ts
const result = await lock.run(userId, async manager => manager.getRepository(User).findOneBy({ id: userId }));
```

[Общий API Reference](../../README.md#api-reference).
