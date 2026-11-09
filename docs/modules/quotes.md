# quotes — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Серверный системный каталог переводимых цитат и пользовательские назначения двух мест отображения.

Исходники: [модуль](../../src/quotes/quotes.module.ts), [сервис](../../src/quotes/quotes.service.ts).

## Публичные сервисы и функции

- `list(): Promise<QuoteResponse[]>` — параметры и результат по TS-сигнатуре.
- `getAssignments(userId: string): Promise<QuoteAssignmentsResponse>` — параметры и результат по TS-сигнатуре.
- `setAssignments(userId: string, data: SetQuoteAssignmentsDto): Promise<QuoteAssignmentsResponse>` — параметры и результат по TS-сигнатуре.

## Модели и схемы данных, связи

SystemQuote.id — стабильный ключ каталога; QuoteAssignment PK (user_id,placement); quoteId → SystemQuote. Пользователь не может менять содержимое каталога.

Сущность [`system-quote`](../../src/quotes/entities/system-quote.entity.ts):

| Поле | Тип |
|---|---|
| `id` | `string` |
| `text` | `LocalizedText` |
| `author` | `LocalizedText` |
| `sourceTitle` | `LocalizedText` |
| `sourceUrl` | `string` |
| `reference` | `string` |
| `createdAt` | `Date` |

Дополнительно: [quote-assignment.entity.ts](../../src/quotes/entities/quote-assignment.entity.ts) определяет назначения текущего аккаунта.

## Зависимости от других модулей

`common`; для хранения используется TypeORM/PostgreSQL, для HTTP — NestJS.

## Конфигурация и переменные окружения

Специфических ENV нет; общие переменные БД, cookie и CORS описаны в [README](../../README.md#конфигурация-env). Для изображений также используется конфигурация S3, но само хранилище управляется Storage/FilesModule.

## Обработка ошибок

Глобальное тело ошибки: `{ statusCode, code, message }`. `401` без сессии; `400` при ошибке DTO; `404` если связанный объект отсутствует либо принадлежит другому пользователю. Исключения реализации: `NotFoundException`.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/quotes
```

Полный API и коды ответов: [README — API Reference](../../README.md#api-reference).
