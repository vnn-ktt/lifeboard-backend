# life — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Хранение долгосрочного текстового видения пользователя.

Исходники: [модуль](../../src/life/life.module.ts), [сервис](../../src/life/life.service.ts).

## Публичные сервисы и функции

- `getVision(userId: string): Promise<` — параметры и результат по TS-сигнатуре.
- `setVision(userId: string, vision: string): Promise<` — параметры и результат по TS-сигнатуре.

## Модели и схемы данных, связи

UserLifeSettings.userId — PK и FK на users; одна запись vision на аккаунт.

Сущность [`user-life-settings`](../../src/life/entities/user-life-settings.entity.ts):

| Поле | Тип |
|---|---|
| `userId` | `string` |
| `vision` | `string` |
| `updatedAt` | `Date` |



## Зависимости от других модулей

Нет межмодульных зависимостей; для хранения используется TypeORM/PostgreSQL, для HTTP — NestJS.

## Конфигурация и переменные окружения

Специфических ENV нет; общие переменные БД, cookie и CORS описаны в [README](../../README.md#конфигурация-env). Для изображений также используется конфигурация S3, но само хранилище управляется Storage/FilesModule.

## Обработка ошибок

Глобальное тело ошибки: `{ statusCode, code, message }`. `401` без сессии; `400` при ошибке DTO; `404` если связанный объект отсутствует либо принадлежит другому пользователю. Исключения реализации: явные HTTP-исключения отсутствуют.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/life/vision
```

Полный API и коды ответов: [README — API Reference](../../README.md#api-reference).
