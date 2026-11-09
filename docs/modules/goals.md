# goals — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Создание и иерархия целей, фокус, измеримость и расписание проверок; без дублирования модели цели.

Источник: [модуль](../../src/goals/goals.module.ts), [сервис](../../src/goals/goals.service.ts).

## Публичные сервисы и функции

- `list(userId: string): Promise<GoalResponseDto[]>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `get(userId: string, goalId: string): Promise<GoalResponseDto>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `create(userId: string, input: CreateGoalDto): Promise<GoalResponseDto>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `update(userId: string, goalId: string, input: UpdateGoalDto): Promise<GoalResponseDto>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `remove(userId: string, goalId: string): Promise<void>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `focus(userId: string): Promise<` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `setFocus(userId: string, goalIds: string[]): Promise<` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.

## Модели и схемы данных, связи

LifeGoal.userId → User.id; parentId → LifeGoal.id; areaId → LifeArea.id. Удаление цели каскадно очищает принадлежащие записи, если это закреплено в миграциях.

Сущность: [`life-goal.entity.ts`](../../src/goals/entities/life-goal.entity.ts).

| Поле | TypeScript-тип |
|---|---|
| `id` | `string` |
| `userId` | `string` |
| `areaId` | `string` |
| `title` | `string` |
| `description` | `string` |
| `horizon` | `GoalHorizon` |
| `target` | `number` |
| `measurement` | `GoalMeasurement` |
| `startDate` | `string \| null` |
| `dueDate` | `string \| null` |
| `checkinFrequency` | `GoalCheckinFrequency \| null` |
| `checkinWeekday` | `number \| null` |
| `checkinFromDate` | `string \| null` |
| `parentId` | `string \| null` |
| `status` | `GoalStatus` |
| `completedAt` | `Date \| null` |
| `focusPosition` | `number \| null` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |

## Зависимости

`common`. Инфраструктурные зависимости: NestJS; для сущностей — TypeORM/PostgreSQL.

## Конфигурация и переменные окружения

Специфических переменных окружения нет.. Полные значения, обязательность и дефолты: [таблица ENV в README](../../README.md#конфигурация-env).

## Обработка ошибок

Маршруты подчиняются общему контракту `{statusCode, code, message}`: `401` без действительной сессии, `400` при невалидном DTO, `404` для чужого или отсутствующего ресурса. Дополнительные исключения, обнаруженные в реализации: `NotFoundException`, `BadRequestException`. База данных может завершить транзакцию при нарушении FK/уникальности; подробности в соответствующей миграции.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/goals
```

HTTP-маршруты и коды ответов перечислены в [API Reference](../../README.md#api-reference). Авторизация: `lifeboard.sid`; примеры `curl` используют cookie-файл с предыдущего входа.
