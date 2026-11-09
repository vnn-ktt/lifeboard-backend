# goal-status — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Идемпотентные переходы статуса и реальная история событий без подстановки фиктивных переходов.

Исходники: [модуль](../../src/goal-status/goal-status.module.ts), [сервис](../../src/goal-status/goal-status.service.ts).

## Публичные сервисы и функции

- `change(userId: string, goalId: string, nextStatus: GoalStatus): Promise<GoalResponseDto>` — аргументы и возврат из актуальной TS-сигнатуры.
- `history(userId: string, goalId: string, cursor?: string, limit = 30): Promise<` — аргументы и возврат из актуальной TS-сигнатуры.

## Модели и схемы данных, связи

GoalStatusEvent.goalId,userId → LifeGoal, FK с CASCADE. completedAt хранится в LifeGoal; последовательность событий в goal_status_events.

Сущность: [`goal-status-event.entity.ts`](../../src/goal-status/entities/goal-status-event.entity.ts).

| Поле | Тип |
|---|---|
| `id` | `string` |
| `userId` | `string` |
| `goalId` | `string` |
| `status` | `GoalStatus` |
| `changedAt` | `Date` |

## Зависимости от других модулей

`goals`, `common`. Инфраструктура: NestJS, PostgreSQL, TypeORM. Проверка владельца каждой сущности производится сервером.

## Конфигурация и переменные окружения

Специфических ENV не вводится; применяются переменные PostgreSQL и глобальной авторизации из [README](../../README.md#конфигурация-env). Для календарных операций используется timezone из `users.timezone` (по умолчанию `UTC`).

## Обработка ошибок

Глобальный формат `{ statusCode, code, message }`. `401` — нет сессии, `400` — невалидный ввод, `404` — отсутствующий или чужой ресурс. Исключения сервиса: `NotFoundException`. Конфликты уникальности и целостности контролируются миграциями, записи выполняются транзакционно там, где это предусмотрено сервисом.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/goals/00000000-0000-4000-8000-000000000001/status-events
```

Полный перечень URL и кодов ответов находится в [API Reference](../../README.md#api-reference).
