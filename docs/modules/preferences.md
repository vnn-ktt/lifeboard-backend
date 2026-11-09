# preferences — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Настройки UI текущего пользователя: тема, язык, способ ввода целей и параметры приватности.

Исходники: [модуль](../../src/preferences/preferences.module.ts), [сервис](../../src/preferences/preferences.service.ts).

## Публичные сервисы и функции

- `get(userId: string): тип выводится TypeScript` — параметры и результат по TS-сигнатуре.
- `set(userId: string, input: UpdatePreferencesDto): тип выводится TypeScript` — параметры и результат по TS-сигнатуре.

## Модели и схемы данных, связи

UserPreferences.userId — PK/FK на users с CASCADE. Настройки разделены от серверной авторизации.

Сущность [`user-preferences`](../../src/preferences/entities/user-preferences.entity.ts):

| Поле | Тип |
|---|---|
| `userId` | `string` |
| `theme` | `Theme` |
| `language` | `Language` |
| `goalEntryMode` | `GoalEntryMode` |
| `showHelper` | `boolean` |
| `showAvatar` | `boolean` |
| `maskStats` | `boolean` |
| `updatedAt` | `Date` |



## Зависимости от других модулей

`common`; для хранения используется TypeORM/PostgreSQL, для HTTP — NestJS.

## Конфигурация и переменные окружения

Специфических ENV нет; общие переменные БД, cookie и CORS описаны в [README](../../README.md#конфигурация-env). Для изображений также используется конфигурация S3, но само хранилище управляется Storage/FilesModule.

## Обработка ошибок

Глобальное тело ошибки: `{ statusCode, code, message }`. `401` без сессии; `400` при ошибке DTO; `404` если связанный объект отсутствует либо принадлежит другому пользователю. Исключения реализации: явные HTTP-исключения отсутствуют.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/users/me/preferences
```

Полный API и коды ответов: [README — API Reference](../../README.md#api-reference).
