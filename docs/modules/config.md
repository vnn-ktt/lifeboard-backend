# Конфигурация — модуль инфраструктуры

## Назначение и зона ответственности

`src/config/environment.ts` задаёт тип `Environment` и строгую функцию `validateEnvironment(raw: Record<string, unknown>): Environment`. Все ENV валидируются при старте и работе CLI миграций.

## Публичные сервисы и функции

- `validateEnvironment(raw: Record<string, unknown>): Environment` — проверяет обязательные строки, булевы значения, порт, origin и S3 endpoint; возвращает нормализованную конфигурацию, при ошибке бросает `Error` с именем ENV.

## Модели/схемы данных и связи

`Environment` — TypeScript-тип, таблиц PostgreSQL нет. Значения используются `AppModule`, `S3StorageProvider`, `AuthController` и CLI миграций.

## Зависимости

Локальные `src/utils/type-guards.ts`, `@nestjs/config` при внедрении.

## Конфигурация и переменные окружения

Все имена, дефолты и примеры содержатся в [README](../../README.md#конфигурация-env), `.env.example` — шаблон. Реальный `.env` не коммитится.

## Обработка ошибок

Неверный/отсутствующий обязательный ENV приводит к отказу запуска. В production S3 endpoint должен быть HTTPS.

## Пример использования

```ts
import { validateEnvironment } from '@/config/environment';
const env = validateEnvironment(process.env);
console.info(env.NODE_ENV, env.PORT);
```
