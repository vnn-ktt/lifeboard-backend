# auth — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Регистрация, вход и отзыв серверных сессий через HttpOnly-cookie; глобальная проверка доступа.

Источник: [модуль](../../src/auth/auth.module.ts), [сервис](../../src/auth/auth.service.ts).

## Публичные сервисы и функции

- `register(input: RegisterDto): Promise<AuthResult>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `login(input: LoginDto): Promise<AuthResult>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.
- `logout(sessionId: string): Promise<void>` — параметры и возвращаемое значение указаны в сигнатуре; исключения см. ниже.

## Модели и схемы данных, связи

UserSession.userId → User.id (CASCADE). В БД хранится хеш токена; открытый токен существует только в cookie.

Сущность: [`user-session.entity.ts`](../../src/auth/entities/user-session.entity.ts).

| Поле | TypeScript-тип |
|---|---|
| `id` | `string` |
| `userId` | `string` |
| `user` | `User` |
| `tokenHash` | `string` |
| `createdAt` | `Date` |
| `expiresAt` | `Date` |
| `revokedAt` | `Date \| null` |

## Зависимости

`users`. Инфраструктурные зависимости: NestJS; для сущностей — TypeORM/PostgreSQL.

## Конфигурация и переменные окружения

`COOKIE_SECURE`, `WEB_ORIGIN`. Полные значения, обязательность и дефолты: [таблица ENV в README](../../README.md#конфигурация-env).

## Обработка ошибок

Маршруты подчиняются общему контракту `{statusCode, code, message}`: `401` без действительной сессии, `400` при невалидном DTO, `404` для чужого или отсутствующего ресурса. Дополнительные исключения, обнаруженные в реализации: `UnauthorizedException`. База данных может завершить транзакцию при нарушении FK/уникальности; подробности в соответствующей миграции.

## Пример использования

```bash
curl -i -c cookies.txt -H 'Content-Type: application/json' -d '{"email":"member@example.com","name":"Member","password":"StrongPassword-12345"}' http://localhost:3000/api/v1/auth/register
```

HTTP-маршруты и коды ответов перечислены в [API Reference](../../README.md#api-reference). Авторизация: `lifeboard.sid`; примеры `curl` используют cookie-файл с предыдущего входа.
