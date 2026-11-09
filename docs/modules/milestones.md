# milestones — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Этапы целей: сортировка, даты, транзакционное изменение и идемпотентное завершение.

Исходники: [модуль](../../src/milestones/milestones.module.ts), [сервис](../../src/milestones/milestones.service.ts).

## Публичные сервисы и функции

- `list(userId: string, goalId: string): Promise<MilestoneResponseDto[]>` — аргументы и возврат из актуальной TS-сигнатуры.
- `create(userId: string, goalId: string, data: CreateMilestoneDto): Promise<MilestoneResponseDto>` — аргументы и возврат из актуальной TS-сигнатуры.
- `update(userId: string, goalId: string, milestoneId: string, data: UpdateMilestoneDto): Promise<MilestoneResponseDto>` — аргументы и возврат из актуальной TS-сигнатуры.
- `complete(userId: string, goalId: string, milestoneId: string, completed: boolean): Promise<MilestoneResponseDto>` — аргументы и возврат из актуальной TS-сигнатуры.
- `remove(userId: string, goalId: string, milestoneId: string): Promise<void>` — аргументы и возврат из актуальной TS-сигнатуры.

## Модели и схемы данных, связи

GoalMilestone.goalId,userId → LifeGoal. При удалении этапа задачи не удаляются, milestoneId сбрасывается в NULL.

Сущность: [`goal-milestone.entity.ts`](../../src/milestones/entities/goal-milestone.entity.ts).

| Поле | Тип |
|---|---|
| `id` | `string` |
| `userId` | `string` |
| `goalId` | `string` |
| `title` | `string` |
| `description` | `string` |
| `order` | `number` |
| `dueDate` | `string \| null` |
| `completedAt` | `Date \| null` |
| `createdAt` | `Date` |

## Зависимости от других модулей

`goals`, `common`. Инфраструктура: NestJS, PostgreSQL, TypeORM. Проверка владельца каждой сущности производится сервером.

## Конфигурация и переменные окружения

Специфических ENV не вводится; применяются переменные PostgreSQL и глобальной авторизации из [README](../../README.md#конфигурация-env). Для календарных операций используется timezone из `users.timezone` (по умолчанию `UTC`).

## Обработка ошибок

Глобальный формат `{ statusCode, code, message }`. `401` — нет сессии, `400` — невалидный ввод, `404` — отсутствующий или чужой ресурс. Исключения сервиса: `NotFoundException`. Конфликты уникальности и целостности контролируются миграциями, записи выполняются транзакционно там, где это предусмотрено сервисом.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/goals/00000000-0000-4000-8000-000000000001/milestones
```

Полный перечень URL и кодов ответов находится в [API Reference](../../README.md#api-reference).
