# app — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Точка композиции приложения: глобальная конфигурация, подключение PostgreSQL и регистрация функциональных модулей.

Источник: [модуль](../../src/app.module.ts).

## Публичные сервисы и функции

`AppModule` — NestJS-класс композиции, публичных методов предметной области не предоставляет. Бутстрап: `src/main.ts`.

## Модели и схемы данных, связи

AppModule не хранит предметные данные: импортирует все функциональные модули, ConfigModule и TypeOrmModule.

Собственной таблицы нет: используются сущности импортированных модулей.

## Зависимости

`config`, `database`, `health`, `auth`, `users`, `areas`, `goals`, `life`, `routines`, `progress`, `reviews`, `files`, `goal-metrics`, `goal-checkins`, `goal-status`, `milestones`, `tasks`, `notes`, `note-groups`, `quotes`, `preferences`, `data-transfer`. Инфраструктурные зависимости: NestJS; для сущностей — TypeORM/PostgreSQL.

## Конфигурация и переменные окружения

`NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`, `DB_SSL`, `WEB_ORIGIN`, `COOKIE_SECURE`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`. Полные значения, обязательность и дефолты: [таблица ENV в README](../../README.md#конфигурация-env).

## Обработка ошибок

Маршруты подчиняются общему контракту `{statusCode, code, message}`: `401` без действительной сессии, `400` при невалидном DTO, `404` для чужого или отсутствующего ресурса. Дополнительные исключения, обнаруженные в реализации: специальных исключений в сервисе не обнаружено. База данных может завершить транзакцию при нарушении FK/уникальности; подробности в соответствующей миграции.

## Пример использования

```ts
import { AppModule } from '@/app.module';
const app = await NestFactory.create(AppModule);
```

HTTP-маршруты и коды ответов перечислены в [API Reference](../../README.md#api-reference). Авторизация: `lifeboard.sid`; примеры `curl` используют cookie-файл с предыдущего входа.
