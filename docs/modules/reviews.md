# reviews — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Еженедельная рефлексия с привязкой к понедельнику недели и перезаписью состояния недели.

Исходники: [модуль](../../src/reviews/reviews.module.ts), [сервис](../../src/reviews/reviews.service.ts).

## Публичные сервисы и функции

- `list(userId: string, from: string, to: string): Promise<WeeklyReviewResponseDto[]>` — параметры и результат по TS-сигнатуре.
- `get(userId: string, date: string): Promise<WeeklyReviewResponseDto>` — параметры и результат по TS-сигнатуре.
- `save(userId: string, date: string, input: SaveReviewDto): Promise<WeeklyReviewResponseDto>` — параметры и результат по TS-сигнатуре.
- `remove(userId: string, date: string): Promise<void>` — параметры и результат по TS-сигнатуре.

## Модели и схемы данных, связи

WeeklyReview имеет составной PK (user_id,week_start); неделю задаёт локальная календарная дата.

Сущность [`weekly-review`](../../src/reviews/entities/weekly-review.entity.ts):

| Поле | Тип |
|---|---|
| `userId` | `string` |
| `weekStart` | `string` |
| `wins` | `string` |
| `obstacles` | `string` |
| `nextStep` | `string` |
| `mood` | `number` |
| `updatedAt` | `Date` |



## Зависимости от других модулей

Нет межмодульных зависимостей; для хранения используется TypeORM/PostgreSQL, для HTTP — NestJS.

## Конфигурация и переменные окружения

Специфических ENV нет; общие переменные БД, cookie и CORS описаны в [README](../../README.md#конфигурация-env). Для изображений также используется конфигурация S3, но само хранилище управляется Storage/FilesModule.

## Обработка ошибок

Глобальное тело ошибки: `{ statusCode, code, message }`. `401` без сессии; `400` при ошибке DTO; `404` если связанный объект отсутствует либо принадлежит другому пользователю. Исключения реализации: `BadRequestException`, `NotFoundException`.

## Пример использования

```bash
curl -i -b cookies.txt 'http://localhost:3000/api/v1/reviews?from=2026-11-01&to=2026-11-09'
```

Полный API и коды ответов: [README — API Reference](../../README.md#api-reference).
