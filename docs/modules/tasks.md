# tasks — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Разовые задачи, принадлежащие цели; опциональная привязка к этапу; выборка открытых задач для Today.

Исходники: [модуль](../../src/tasks/tasks.module.ts), [сервис](../../src/tasks/tasks.service.ts).

## Публичные сервисы и функции

- `list(userId: string, goalId: string): Promise<TaskResponseDto[]>` — аргументы и возврат из актуальной TS-сигнатуры.
- `due(userId: string, date: string): Promise<TaskResponseDto[]>` — аргументы и возврат из актуальной TS-сигнатуры.
- `create(userId: string, goalId: string, data: CreateTaskDto): Promise<TaskResponseDto>` — аргументы и возврат из актуальной TS-сигнатуры.
- `update(userId: string, goalId: string, taskId: string, data: UpdateTaskDto): Promise<TaskResponseDto>` — аргументы и возврат из актуальной TS-сигнатуры.
- `complete(userId: string, goalId: string, taskId: string, completed: boolean): Promise<TaskResponseDto>` — аргументы и возврат из актуальной TS-сигнатуры.
- `remove(userId: string, goalId: string, taskId: string): Promise<void>` — аргументы и возврат из актуальной TS-сигнатуры.

## Модели и схемы данных, связи

GoalTask.goalId,userId → LifeGoal; milestoneId,goalId,userId → GoalMilestone. При удалении milestone связывающая колонка получает NULL.

Сущность: [`goal-task.entity.ts`](../../src/tasks/entities/goal-task.entity.ts).

| Поле | Тип |
|---|---|
| `id` | `string` |
| `userId` | `string` |
| `goalId` | `string` |
| `milestoneId` | `string \| null` |
| `title` | `string` |
| `description` | `string` |
| `dueDate` | `string \| null` |
| `completedAt` | `Date \| null` |
| `createdAt` | `Date` |

## Зависимости от других модулей

`goals`, `milestones`, `common`. Инфраструктура: NestJS, PostgreSQL, TypeORM. Проверка владельца каждой сущности производится сервером.

## Конфигурация и переменные окружения

Специфических ENV не вводится; применяются переменные PostgreSQL и глобальной авторизации из [README](../../README.md#конфигурация-env). Для календарных операций используется timezone из `users.timezone` (по умолчанию `UTC`).

## Обработка ошибок

Глобальный формат `{ statusCode, code, message }`. `401` — нет сессии, `400` — невалидный ввод, `404` — отсутствующий или чужой ресурс. Исключения сервиса: `NotFoundException`. Конфликты уникальности и целостности контролируются миграциями, записи выполняются транзакционно там, где это предусмотрено сервисом.

## Пример использования

```bash
curl -i -b cookies.txt 'http://localhost:3000/api/v1/tasks/due?date=2026-11-09'
```

Полный перечень URL и кодов ответов находится в [API Reference](../../README.md#api-reference).
