# progress — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Расчёт прогресса целей: независимо результат измерений и выполнение действий, недельные показатели.

Исходники: [модуль](../../src/progress/progress.module.ts), [сервис](../../src/progress/progress.service.ts).

## Публичные сервисы и функции

- `goal(userId: string, goalId: string, at: string = todayUtc()): Promise<GoalProgressResponseDto>` — аргументы и возврат из актуальной TS-сигнатуры.
- `week(userId: string, date: string): Promise<ReturnType<typeof weeklyPlanStats>>` — аргументы и возврат из актуальной TS-сигнатуры.

## Модели и схемы данных, связи

Не владеет таблицами: читает life_goals, goal_metric_entries, life_routines и routine_checks.

Собственная таблица отсутствует: агрегирует данные перечисленных модулей.

## Зависимости от других модулей

`goals`, `goal-metrics`, `routines`. Инфраструктура: NestJS, PostgreSQL, TypeORM. Проверка владельца каждой сущности производится сервером.

## Конфигурация и переменные окружения

Специфических ENV не вводится; применяются переменные PostgreSQL и глобальной авторизации из [README](../../README.md#конфигурация-env). Для календарных операций используется timezone из `users.timezone` (по умолчанию `UTC`).

## Обработка ошибок

Глобальный формат `{ statusCode, code, message }`. `401` — нет сессии, `400` — невалидный ввод, `404` — отсутствующий или чужой ресурс. Исключения сервиса: `NotFoundException`. Конфликты уникальности и целостности контролируются миграциями, записи выполняются транзакционно там, где это предусмотрено сервисом.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/goals/00000000-0000-4000-8000-000000000001/progress
```

Полный перечень URL и кодов ответов находится в [API Reference](../../README.md#api-reference).
