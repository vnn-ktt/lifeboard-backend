# areas — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Системные и персональные области жизни; удаление области запрещено при наличии зависимых целей.

Источник: [модуль](../../src/areas/areas.module.ts), [сервис](../../src/areas/areas.service.ts).

## Публичные сервисы и функции

- `list(userId: string): Promise<AreaResponseDto[]>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `create(userId: string, input: CreateAreaDto): Promise<AreaResponseDto>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `remove(userId: string, areaId: string): Promise<void>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.

## Модели и схемы данных, связи

LifeArea.userId=NULL означает системную область; LifeGoal.areaId → LifeArea.id. ID системных областей постоянны.

Сущность: [`life-area.entity.ts`](../../src/areas/entities/life-area.entity.ts).

| Поле | TypeScript-тип |
|---|---|
| `id` | `string` |
| `userId` | `string \| null` |
| `name` | `string` |
| `icon` | `string` |
| `accent` | `string` |
| `subtle` | `string` |
| `createdAt` | `Date` |

## Зависимости

`common`. Инфраструктурные зависимости: NestJS; для сущностей — TypeORM/PostgreSQL.

## Конфигурация и переменные окружения

Специфических переменных окружения нет.. Полные значения, обязательность и дефолты: [таблица ENV в README](../../README.md#конфигурация-env).

## Обработка ошибок

Маршруты подчиняются общему контракту `{statusCode, code, message}`: `401` без действительной сессии, `400` при невалидном DTO, `404` для чужого или отсутствующего ресурса. Дополнительные исключения, обнаруженные в реализации: `ConflictException`, `NotFoundException`, `ForbiddenException`. База данных может завершить транзакцию при нарушении FK/уникальности; подробности в соответствующей миграции.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/areas
```

HTTP-маршруты и коды ответов перечислены в [API Reference](../../README.md#api-reference). Авторизация: `lifeboard.sid`; примеры `curl` используют cookie-файл с предыдущего входа.
