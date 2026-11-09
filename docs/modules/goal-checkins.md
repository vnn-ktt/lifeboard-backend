# goal-checkins — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Расчёт очереди ежедневных/еженедельных проверок и атомарное подтверждение результата без смешивания с измерениями.

Исходники: [модуль](../../src/goal-checkins/goal-checkins.module.ts), [сервис](../../src/goal-checkins/goal-checkins.service.ts).

## Публичные сервисы и функции

- `due(userId: string): Promise<PendingGoalCheckinResponseDto[]>` — аргументы и возврат из актуальной TS-сигнатуры.
- `history(userId: string, goalId: string): тип выводится TypeScript` — аргументы и возврат из актуальной TS-сигнатуры.
- `complete(userId: string, goalId: string, body: CompleteCheckinDto): тип выводится TypeScript` — аргументы и возврат из актуальной TS-сигнатуры.

## Модели и схемы данных, связи

GoalCheckin.goalId,userId → LifeGoal; metricEntryId → GoalMetricEntry (nullable, ON DELETE SET NULL). Уникальность goal_id+due_date.

Сущность: [`goal-checkin.entity.ts`](../../src/goal-checkins/entities/goal-checkin.entity.ts).

| Поле | Тип |
|---|---|
| `id` | `string` |
| `userId` | `string` |
| `goalId` | `string` |
| `dueDate` | `string` |
| `completedAt` | `Date` |
| `status` | `GoalCheckinStatus` |
| `metricEntryId` | `string \| null` |

## Зависимости от других модулей

`goals`, `users`, `goal-metrics`, `common`. Инфраструктура: NestJS, PostgreSQL, TypeORM. Проверка владельца каждой сущности производится сервером.

## Конфигурация и переменные окружения

Специфических ENV не вводится; применяются переменные PostgreSQL и глобальной авторизации из [README](../../README.md#конфигурация-env). Для календарных операций используется timezone из `users.timezone` (по умолчанию `UTC`).

## Обработка ошибок

Глобальный формат `{ statusCode, code, message }`. `401` — нет сессии, `400` — невалидный ввод, `404` — отсутствующий или чужой ресурс. Исключения сервиса: `NotFoundException`, `ConflictException`, `BadRequestException`. Конфликты уникальности и целостности контролируются миграциями, записи выполняются транзакционно там, где это предусмотрено сервисом.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/goal-checkins/due
```

Полный перечень URL и кодов ответов находится в [API Reference](../../README.md#api-reference).
