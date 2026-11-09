# Lifeboard Backend 1.0.0

NestJS 11 · Node.js 24 · PostgreSQL 17 · TypeORM 0.3 · Bun · S3-compatible private Bucket.

## Overview

REST backend приложения Lifeboard для хранения целей, измерений, check-ins, действий, этапов, разовых задач, рефлексий, заметок, изображений и настроек. Пользователи изолированы серверными сессиями и SQL-связями.

## Scope / Out of scope

**Входит:** описанные REST-модули, session-auth, PostgreSQL, S3, импорт/экспорт LifeState v1, миграции, health-checks, release-проверки и документация. **AI/ML не входит в релиз 1.0.0:** реализации или нового API для этого функционала нет. Также вне текущего объёма: push-уведомления, распределённые очереди и микросервисы.

## Архитектура

```text
Vue browser (credentials: include)
           │ HTTPS
           ▼
  reverse proxy (/api/v1)
           │
           ▼
NestJS Controllers + DTO + Auth Guard
           │
           ▼
Domain / Services / UserWriteLock
           ├──── TypeORM ────── PostgreSQL 17
           └──── StorageService ─ Private S3 Bucket
```

Слои: `controller` реализует HTTP, `dto` валидирует данные через глобальный `ValidationPipe`, `service` проверяет владельца и бизнес-ограничения, `domain` содержит чистые правила, `entity/migration` фиксируют SQL-схему. Фактический прогресс результата и выполнение действий не смешиваются.

## Модули

- [`app`](docs/modules/app.md)
- [`areas`](docs/modules/areas.md)
- [`auth`](docs/modules/auth.md)
- [`common-user-write-lock`](docs/modules/common-user-write-lock.md)
- [`data-transfer`](docs/modules/data-transfer.md)
- [`files`](docs/modules/files.md)
- [`goal-checkins`](docs/modules/goal-checkins.md)
- [`goal-metrics`](docs/modules/goal-metrics.md)
- [`goal-status`](docs/modules/goal-status.md)
- [`goals`](docs/modules/goals.md)
- [`health`](docs/modules/health.md)
- [`life`](docs/modules/life.md)
- [`milestones`](docs/modules/milestones.md)
- [`note-groups`](docs/modules/note-groups.md)
- [`notes`](docs/modules/notes.md)
- [`preferences`](docs/modules/preferences.md)
- [`progress`](docs/modules/progress.md)
- [`quotes`](docs/modules/quotes.md)
- [`reviews`](docs/modules/reviews.md)
- [`routines`](docs/modules/routines.md)
- [`storage`](docs/modules/storage.md)
- [`tasks`](docs/modules/tasks.md)
- [`users`](docs/modules/users.md)
- [`config`](docs/modules/config.md)
- [`database`](docs/modules/database.md)

Все файлы `docs/modules/*` содержат назначение, сигнатуры, модели, связи, зависимости, ENV, ошибки и пример использования.

## Требования

Node.js **24.x** (`>=24 <25`), PostgreSQL **17**, Bun (менеджер пакетов), приватный S3-compatible bucket. Docker Engine + Compose нужны для контейнерной конфигурации. Прямые зависимости и devDependencies имеют фиксированные версии в `package.json`, разрешённые транзитивные версии — в `bun.lock`.

## Установка и локальный запуск

```bash
git clone https://github.com/vnn-ktt/lifeboard-backend.git
cd lifeboard-backend
cp .env.example .env
# настроить DB_USER, DB_PASSWORD и WEB_ORIGIN
docker compose -f compose.yaml -f compose.storage.dev.yaml up -d db storage
bun install --frozen-lockfile
bun run db:migrate
bun run start:dev
```

Базовый URL: `http://localhost:3000/api/v1`. Запуск `api` через Compose: `docker compose -f compose.yaml -f compose.storage.dev.yaml up -d --build`. Для тестового облачного S3 допускается не запускать локальный `storage`, задав `S3_*` в `.env`.

## Конфигурация ENV

| Имя | Назначение | Обязательно | Дефолт | Пример |
|---|---|---|---|---|
| `NODE_ENV` | Окружение | Нет | development | `production` |
| `PORT` | HTTP-порт | Нет | 3000 | `3000` |
| `DB_HOST` | PostgreSQL hostname | Да | — | `127.0.0.1` |
| `DB_PORT` | PostgreSQL port | Нет | 5432 | `5432` |
| `DB_USER` | Пользователь БД | Да | — | `lifeboard` |
| `DB_PASSWORD` | Пароль БД | Да | — | `(секрет)` |
| `DB_NAME` | Имя БД | Да | — | `lifeboard` |
| `DB_POOL_SIZE` | Размер пула | Нет | 10 | `10` |
| `DB_SSL` | TLS к PostgreSQL | Нет | false | `true` |
| `WEB_ORIGIN` | Точный origin frontend | Рекомендуется явно | http://localhost:8080 | `https://app.example.com` |
| `COOKIE_SECURE` | Secure cookie | Нет | true в production; false вне production | `true` |
| `S3_ENDPOINT` | S3 API endpoint | Да в production | http://127.0.0.1:8333 вне production | `https://storage.yandexcloud.net` |
| `S3_REGION` | Регион S3 | Нет | ru-central1 | `ru-central1` |
| `S3_BUCKET` | Приватный S3 bucket | Да в production | lifeboard-dev вне production | `lifeboard-prod` |
| `S3_ACCESS_KEY_ID` | S3 access key | Да в production | lifeboard-dev вне production | `(секрет)` |
| `S3_SECRET_ACCESS_KEY` | S3 secret | Да в production | lifeboard-local-secret вне production | `(секрет)` |
| `S3_FORCE_PATH_STYLE` | Path-style addressing | Нет | true | `true` |
| `DB_EXPOSE_PORT` | Порт БД для Docker Compose | Нет, Compose | 5432 | `5433` |
| `TEST_DB_NAME` | Отдельная БД интеграционных тестов | Да, integration | — | `lifeboard_test` |

Примечания: `DB_EXPOSE_PORT` читает только Compose; `TEST_DB_NAME` — тесты. В production `WEB_ORIGIN` нужно задавать **явно**, `COOKIE_SECURE=true`, а `S3_ENDPOINT` обязан использовать HTTPS. Не используйте дефолтные локальные ключи на публичном окружении.

## Миграции БД и сиды

`src/database/migrations` содержит последовательные миграции. В TypeORM установлено `synchronize: false`, `migrationsRun: false`. Выполнить: `bun run db:migrate`; откатить последнюю с возможной потерей данных: `bun run db:revert`; в контейнере: `bun run db:migrate:prod` (Compose запускает мигратор отдельным сервисом). Системные области и системный каталог цитат загружаются миграциями; отдельного обязательного seed-скрипта нет. Перед production-миграцией нужен проверенный бэкап PostgreSQL.

## Тесты, E2E и покрытие

```bash
bun run lint
bun run typecheck
bun run test
bun run test:coverage
TEST_DB_NAME=lifeboard_test bun run test:integration
DB_NAME=lifeboard_test bun run test:e2e
bun run build
```

Unit — `node:test`; integration — отдельная PostgreSQL 17 с миграциями; E2E — HTTP smoke (health, 401, validation, регистрация и cookie-auth). Отчёт V8 coverage запускается `test:coverage`, числовой порог **не установлен**; не заявляем неподтверждённое покрытие. База `lifeboard_test` создаётся вручную либо шагом GitHub Actions. Настоящий S3 проверяется отдельным staging smoke.

## Линтеры / форматтеры / CI

`bun run lint` использует `scripts/check-repository.mjs`: запрещённые debug-паттерны, документация каждого модуля, совпадение API Reference с контроллерами. **ESLint и Prettier в текущем проекте не установлены** — наличие автоформатирования не заявляется; исходники пишутся в UTF-8/LF, TypeScript strict. CI `.github/workflows/backend-ci.yml`: Bun frozen install, lint, typecheck, unit, build, интеграционные тесты PostgreSQL, E2E, coverage и проверка lockfile.

## Docker / docker-compose

`Dockerfile` использует Node.js 24, установку зависимостей Bun и непривилегированного пользователя при runtime. `compose.yaml`: db, migrate, api, healthchecks, локальный проброс DB и API через 127.0.0.1. `compose.storage.dev.yaml` — dev-only S3-compatible storage; не используйте его credentials в production. TLS/reverse proxy **не включены** в Compose и должны настраиваться отдельно.

## Деплой и окружения dev/staging/prod

**Dev:** `NODE_ENV=development`, локальная PostgreSQL и тестовый bucket, HTTP cookie допускается только локально. **Staging:** `NODE_ENV=production` с отдельными DB/bucket, HTTPS, `WEB_ORIGIN` staging, проверкой миграций и real-S3 upload/export. **Prod:** `NODE_ENV=production`, `COOKIE_SECURE=true`, TLS до S3, приватный bucket, секреты из защищённого хранилища, backup перед запуском миграций. Rollback данных — из резервной копии; не рассчитывайте на безусловный безопасный `db:revert`.

## Логирование и мониторинг

Используется `Logger` NestJS, непредвиденные ошибки логируются сервером и не раскрывают stack trace через API. Публичные health endpoints: `/api/v1/health/live` (не зависит от БД) и `/api/v1/health/ready` (запрос к PostgreSQL). Систему метрик или распределённой трассировки backend не реализует; внешний мониторинг должен проверять readiness и собирать логи контейнеров. Отказы S3 проверяются отдельно.

## Безопасность

`lifeboard.sid`: HttpOnly, SameSite=Lax, Secure при HTTPS, Path=/api/v1, срок 7 дней. В БД сохраняется SHA-256 токена сессии, не raw-cookie. `SessionAuthGuard` глобальный, только health, login и register доступны без сессии. CORS с credentials разрешён только `WEB_ORIGIN`; unsafe requests проверяются по Origin (защита для cookie). Throttler: базовый лимит 120 запросов/мин, дополнительные ограничения на login/register, файлы, импорт/экспорт. Секреты не должны попадать в frontend `VITE_*`. Ответ об ошибке имеет `{statusCode,code,message}`, ошибки SQL/stack не возвращаются клиенту.

## Версионирование API

Реальный глобальный префикс NestJS: `/api/v1`, релиз приложения 1.0.0 не переименовывает маршруты. Swagger UI: `/api/docs`, OpenAPI JSON: `/api/docs-json`. Обновления несовместимого API должны выпускаться отдельно.

## API Reference

Перечислены **все маршруты из контроллеров** с реальным `/api/v1`. `Auth: Да` означает действующую session-cookie, `Нет` — публичный Health. Общие ответы `400` (DTO), `401` (нет сессии), `429` (rate limit) могут применяться к защищённым endpoint дополнительно к указанным в таблице.

### Health

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/health/live` | Health | Нет | Liveness | 200 |
| GET | `/api/v1/health/ready` | Health | Нет | Readiness | undefined |

### Auth

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/register` | Auth | Да | Регистрация | 201,400,409,429 |
| POST | `/api/v1/auth/login` | Auth | Да | Вход | undefined |
| POST | `/api/v1/auth/logout` | Auth | Да | Завершение | undefined |

### Users

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/users/me` | Users | Да | Профиль | 200,401 |
| PATCH | `/api/v1/users/me` | Users | Да | Редактирование | undefined |
| PUT | `/api/v1/users/me/avatar` | Users | Да | Установка | undefined |
| PATCH | `/api/v1/users/me/timezone` | Users | Да | Смена | undefined |

### Preferences

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/users/me/preferences` | Preferences | Да | Настройки | 200,401 |
| PUT | `/api/v1/users/me/preferences` | Preferences | Да | Изменение | undefined |

### Areas

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/areas` | Areas | Да | Области | 200,401 |
| POST | `/api/v1/areas` | Areas | Да | Новая | undefined |
| DELETE | `/api/v1/areas/:id` | Areas | Да | Удалить | undefined |

### Goals

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/goals` | Goals | Да | Список | undefined |
| GET | `/api/v1/goals/focus` | Goals | Да | Фокус | 200,401 |
| PUT | `/api/v1/goals/focus` | Goals | Да | Изменить | undefined |
| GET | `/api/v1/goals/:id` | Goals | Да | Получить | undefined |
| POST | `/api/v1/goals` | Goals | Да | Создать | undefined |
| PATCH | `/api/v1/goals/:id` | Goals | Да | Редактировать | undefined |
| DELETE | `/api/v1/goals/:id` | Goals | Да | Удалить | undefined |

### Goal Status

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| PATCH | `/api/v1/goals/:goalId/status` | Goal Status | Да | Изменить | undefined |
| GET | `/api/v1/goals/:goalId/status-events` | Goal Status | Да | История | undefined |

### Milestones

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/goals/:goalId/milestones` | Milestones | Да | Список | undefined |
| POST | `/api/v1/goals/:goalId/milestones` | Milestones | Да | Создать | undefined |
| PATCH | `/api/v1/goals/:goalId/milestones/:milestoneId` | Milestones | Да | Редактировать | undefined |
| PUT | `/api/v1/goals/:goalId/milestones/:milestoneId/completion` | Milestones | Да | Завершить/возобновить | 200,400,401,404 |
| DELETE | `/api/v1/goals/:goalId/milestones/:milestoneId` | Milestones | Да | Удалить | undefined |

### Tasks

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/goals/:goalId/tasks` | Tasks | Да | Задачи | undefined |
| POST | `/api/v1/goals/:goalId/tasks` | Tasks | Да | Создать | undefined |
| PATCH | `/api/v1/goals/:goalId/tasks/:taskId` | Tasks | Да | Обновить | undefined |
| PUT | `/api/v1/goals/:goalId/tasks/:taskId/completion` | Tasks | Да | Завершить/возобновить | 200,400,401,404 |
| DELETE | `/api/v1/goals/:goalId/tasks/:taskId` | Tasks | Да | Удалить | undefined |
| GET | `/api/v1/tasks/due` | Tasks | Да | Today: | undefined |

### Goal Metrics

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/goals/:goalId/metrics` | Goal Metrics | Да | Список | undefined |
| POST | `/api/v1/goals/:goalId/metrics` | Goal Metrics | Да | Добавить | undefined |
| DELETE | `/api/v1/goals/:goalId/metrics/:entryId` | Goal Metrics | Да | Удалить | undefined |

### Goal Check-ins

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/goal-checkins/due` | Goal Check-ins | Да | Очередь | undefined |
| GET | `/api/v1/goals/:goalId/checkins` | Goal Check-ins | Да | История | undefined |
| POST | `/api/v1/goals/:goalId/checkins` | Goal Check-ins | Да | Завершить | undefined |

### Routines

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/routines` | Routines | Да | Повторяющиеся | undefined |
| POST | `/api/v1/routines` | Routines | Да | Создать | undefined |
| GET | `/api/v1/routines/day` | Routines | Да | Действия | undefined |
| GET | `/api/v1/routines/checks` | Routines | Да | Проверки | undefined |
| GET | `/api/v1/routines/:id` | Routines | Да | Получить | undefined |
| PATCH | `/api/v1/routines/:id` | Routines | Да | Редактировать | undefined |
| DELETE | `/api/v1/routines/:id` | Routines | Да | Удалить | undefined |
| PUT | `/api/v1/routines/:id/checks/:date` | Routines | Да | Отметить | undefined |

### Progress

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/goals/:id/progress` | Progress | Да | Прогресс | undefined |
| GET | `/api/v1/progress/week` | Progress | Да | Недельный | undefined |

### Reviews

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/reviews` | Reviews | Да | Список | undefined |
| GET | `/api/v1/reviews/:date` | Reviews | Да | Рефлексия | undefined |
| PUT | `/api/v1/reviews/:date` | Reviews | Да | Сохранить | undefined |
| DELETE | `/api/v1/reviews/:date` | Reviews | Да | Удалить | undefined |

### Life

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/life/vision` | Life | Да | Читать | undefined |
| PUT | `/api/v1/life/vision` | Life | Да | Изменить | undefined |

### Notes

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/notes` | Notes | Да | Список | undefined |
| GET | `/api/v1/notes/:id` | Notes | Да | Получить | undefined |
| POST | `/api/v1/notes` | Notes | Да | Создать | undefined |
| PATCH | `/api/v1/notes/:id` | Notes | Да | Изменить | undefined |
| DELETE | `/api/v1/notes/:id` | Notes | Да | Удалить | undefined |

### Note Groups

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/note-groups` | Note Groups | Да | Группы | undefined |
| POST | `/api/v1/note-groups` | Note Groups | Да | Создать | undefined |
| PATCH | `/api/v1/note-groups/:id` | Note Groups | Да | Изменить | undefined |
| DELETE | `/api/v1/note-groups/:id` | Note Groups | Да | Удалить | undefined |

### Quotes

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/v1/quotes` | Quotes | Да | Системные | undefined |
| GET | `/api/v1/quotes/assignments` | Quotes | Да | Назначения | undefined |
| PUT | `/api/v1/quotes/assignments` | Quotes | Да | Обновить | undefined |

### Files

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| POST | `/api/v1/files` | Files | Да | Загрузка | undefined |
| GET | `/api/v1/files/:id` | Files | Да | Метаданные | 200,400,401,404 |
| GET | `/api/v1/files/:id/content` | Files | Да | Содержимое | undefined |
| DELETE | `/api/v1/files/:id` | Files | Да | Удалить | undefined |

### Data Transfer

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| POST | `/api/v1/imports/lifeboard-v1/validate` | Data Transfer | Да | Dry-run | undefined |
| POST | `/api/v1/imports/lifeboard-v1` | Data Transfer | Да | Подтверждённый | undefined |
| GET | `/api/v1/exports/lifeboard-v1` | Data Transfer | Да | Экспорт | undefined |

### Swagger (служебные маршруты)

| Method | Path | Модуль | Auth | Краткое описание | Коды ответов |
|---|---|---|---|---|---|
| GET | `/api/docs` | Swagger | Нет отдельного guard | Swagger UI | 200 |
| GET | `/api/docs-json` | Swagger | Нет отдельного guard | OpenAPI JSON | 200 |

## Troubleshooting / FAQ

**PostgreSQL не доступен:** проверьте DB_HOST (внутри Compose `db`, на host `127.0.0.1`), пароль, `/health/ready`. **401:** `credentials: 'include'`, cookie Path/Secure/SameSite. **403:** Origin должен совпадать с WEB_ORIGIN. **Ошибки S3:** endpoint, bucket, ACL приватных объектов и credentials. **Сбой миграций:** проверьте `typeorm_migrations`, не используйте `synchronize`. **Импорт 409:** аккаунт не пуст или конфликтует ключ идемпотентности; существующие данные не перезаписываются. **Импорт 428:** нужен заголовок `X-Import-Confirmed: true`. **Lockfile:** не запускайте production-сборку без `bun install --frozen-lockfile`.

## Contributing

Работайте через feature-ветки и PR; перед PR запустите lint, typecheck, unit, build, integration. Любой новый контроллерный маршрут вносится в API Reference; каждому модулю `src/**/*.module.ts` соответствует `docs/modules/*.md`. Меняйте БД только новой миграцией, не переписывайте уже применённую. DTO и frontend-контракт согласовывайте до изменения API.

## License

`package.json` содержит `UNLICENSED`, разрешающего файла LICENSE в репозитории нет. Публичные права на использование не предоставлены; решение о лицензировании остаётся за владельцем репозитория.
