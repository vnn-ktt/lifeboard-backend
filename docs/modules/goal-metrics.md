# goal-metrics — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Датированные замеры фактического результата числовой/бинарной цели — независимо от выполненных действий.

Источник: [модуль](../../src/goal-metrics/goal-metrics.module.ts), [сервис](../../src/goal-metrics/goal-metrics.service.ts).

## Публичные сервисы и функции

- `list(userId: string, goalId: string): выводится TypeScript` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `create(userId: string, goalId: string, input: CreateMetricEntryDto): выводится TypeScript` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `remove(userId: string, goalId: string, entryId: string): Promise<void>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.

## Модели и схемы данных, связи

GoalMetricEntry.goalId,userId → LifeGoal; GoalCheckin.metricEntryId — nullable FK, ON DELETE SET NULL.

Сущность: [`goal-metric-entry.entity.ts`](../../src/goal-metrics/entities/goal-metric-entry.entity.ts).

| Поле | TypeScript-тип |
|---|---|


## Зависимости

`common`, `goals`. Инфраструктурные зависимости: NestJS; для сущностей — TypeORM/PostgreSQL.

## Конфигурация и переменные окружения

Специфических переменных окружения нет.. Полные значения, обязательность и дефолты: [таблица ENV в README](../../README.md#конфигурация-env).

## Обработка ошибок

Маршруты подчиняются общему контракту `{statusCode, code, message}`: `401` без действительной сессии, `400` при невалидном DTO, `404` для чужого или отсутствующего ресурса. Дополнительные исключения, обнаруженные в реализации: `NotFoundException`, `BadRequestException`. База данных может завершить транзакцию при нарушении FK/уникальности; подробности в соответствующей миграции.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/goals/00000000-0000-4000-8000-000000000001/metrics
```

HTTP-маршруты и коды ответов перечислены в [API Reference](../../README.md#api-reference). Авторизация: `lifeboard.sid`; примеры `curl` используют cookie-файл с предыдущего входа.
