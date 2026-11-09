# Database — модуль инфраструктуры

## Назначение и зона ответственности

`src/database/database-options.ts` создаёт конфигурацию TypeORM PostgreSQL; `src/database/data-source.ts` используется CLI миграций. `synchronize: false`, `migrationsRun: false` — схема обновляется только явными миграциями.

## Публичные сервисы и функции

- `databaseOptions(config: DatabaseEnvironment): DataSourceOptions` — возвращает настройки PostgreSQL/TypeORM: подключения, SSL, пул, пути сущностей и миграций.
- `AppDataSource` — точка доступа CLI TypeORM в `src/database/data-source.ts` (точное имя экспорта проверяй в исходнике).

## Модели/схемы данных и связи

Миграции `src/database/migrations/` создают все таблицы функциональных модулей и FK. `typeorm_migrations` отслеживает применённые версии; seed системных областей и цитат находится в миграциях.

## Зависимости

`typeorm`, `pg`, `src/config/environment.ts`.

## Конфигурация и ENV

`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`, `DB_SSL`. См. [README](../../README.md#конфигурация-env).

## Обработка ошибок

Сбой подключения, ошибка миграции или ограничение SQL прерывают операцию; в CI выполняется прогон всех миграций в отдельной БД PostgreSQL 17.

## Пример использования

```bash
bun run db:migrate
bun run db:revert
```
