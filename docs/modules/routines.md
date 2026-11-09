# routines — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Повторяющиеся действия по дням ISO-недели и единичные отметки выполнения за локальную календарную дату.

Исходники: [модуль](../../src/routines/routines.module.ts), [сервис](../../src/routines/routines.service.ts).

## Публичные сервисы и функции

- `list(userId: string, goalId?: string): Promise<RoutineResponseDto[]>` — аргументы и возврат из актуальной TS-сигнатуры.
- `get(userId: string, id: string): Promise<RoutineResponseDto>` — аргументы и возврат из актуальной TS-сигнатуры.
- `create(userId: string, input: CreateRoutineDto): Promise<RoutineResponseDto>` — аргументы и возврат из актуальной TS-сигнатуры.
- `update(userId: string, id: string, input: UpdateRoutineDto): Promise<RoutineResponseDto>` — аргументы и возврат из актуальной TS-сигнатуры.
- `remove(userId: string, id: string): Promise<void>` — аргументы и возврат из актуальной TS-сигнатуры.
- `day(userId: string, date: string): Promise<DayRoutinesResponseDto>` — аргументы и возврат из актуальной TS-сигнатуры.
- `listChecks(userId: string, from: string, to: string): Promise<` — аргументы и возврат из актуальной TS-сигнатуры.
- `setDone(userId: string, routineId: string, date: string, done: boolean): Promise<` — аргументы и возврат из актуальной TS-сигнатуры.

## Модели и схемы данных, связи

LifeRoutine.goalId,userId → LifeGoal; RoutineCheck.routineId → LifeRoutine. Комбинация routine_id+date уникальна.

Сущность: [`life-routine.entity.ts`](../../src/routines/entities/life-routine.entity.ts).

| Поле | Тип |
|---|---|
| `id` | `string` |
| `userId` | `string` |
| `goalId` | `string` |
| `title` | `string` |
| `description` | `string` |
| `time` | `string` |
| `days` | `number[]` |
| `durationMinutes` | `number` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |

## Зависимости от других модулей

`common`, `goals`. Инфраструктура: NestJS, PostgreSQL, TypeORM. Проверка владельца каждой сущности производится сервером.

## Конфигурация и переменные окружения

Специфических ENV не вводится; применяются переменные PostgreSQL и глобальной авторизации из [README](../../README.md#конфигурация-env). Для календарных операций используется timezone из `users.timezone` (по умолчанию `UTC`).

## Обработка ошибок

Глобальный формат `{ statusCode, code, message }`. `401` — нет сессии, `400` — невалидный ввод, `404` — отсутствующий или чужой ресурс. Исключения сервиса: `NotFoundException`, `BadRequestException`. Конфликты уникальности и целостности контролируются миграциями, записи выполняются транзакционно там, где это предусмотрено сервисом.

## Пример использования

```bash
curl -i -b cookies.txt 'http://localhost:3000/api/v1/routines/day?date=2026-11-09'
```

Полный перечень URL и кодов ответов находится в [API Reference](../../README.md#api-reference).
