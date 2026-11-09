# users — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Управление собственным профилем, IANA timezone и ссылкой на уже загруженный аватар; безопасная выдача публичного DTO.

Источник: [модуль](../../src/users/users.module.ts), [сервис](../../src/users/users.service.ts).

## Публичные сервисы и функции

- `findByEmailWithPassword(email: string): Promise<User | null>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `setTimezone(userId: string, timezone: string): Promise<User>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `updateProfile(userId: string, input: UpdateProfileDto): Promise<User>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `setAvatar(userId: string, fileId: string | null): Promise<User>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `findById(id: string): Promise<User | null>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `create(input: NewUser): Promise<User>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.

## Модели и схемы данных, связи

User.avatarFileId → StoredFile.id (с проверкой владельца). Пароль хранится только как password_hash, не входит в ответы API.

Сущность: [`user.entity.ts`](../../src/users/entities/user.entity.ts).

| Поле | TypeScript-тип |
|---|---|
| `id` | `string` |
| `email` | `string` |
| `name` | `string` |
| `nickname` | `string \| null` |
| `timezone` | `string` |
| `about` | `string` |
| `avatarFileId` | `string \| null` |
| `passwordHash` | `string` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |

## Зависимости

`common`. Инфраструктурные зависимости: NestJS; для сущностей — TypeORM/PostgreSQL.

## Конфигурация и переменные окружения

Специфических переменных окружения нет.. Полные значения, обязательность и дефолты: [таблица ENV в README](../../README.md#конфигурация-env).

## Обработка ошибок

Маршруты подчиняются общему контракту `{statusCode, code, message}`: `401` без действительной сессии, `400` при невалидном DTO, `404` для чужого или отсутствующего ресурса. Дополнительные исключения, обнаруженные в реализации: `NotFoundException`, `ConflictException`. База данных может завершить транзакцию при нарушении FK/уникальности; подробности в соответствующей миграции.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/users/me
```

HTTP-маршруты и коды ответов перечислены в [API Reference](../../README.md#api-reference). Авторизация: `lifeboard.sid`; примеры `curl` используют cookie-файл с предыдущего входа.
