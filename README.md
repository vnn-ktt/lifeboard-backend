# Lifeboard Backend v0.3.1 — modular architecture refactor

NestJS 11 · TypeORM · PostgreSQL 17 · REST · Bun package manager · Node.js 24 runtime.

**Frontend is unchanged.** This release reorganizes v0.3.0 source files without changing REST routes, response shapes, PostgreSQL schema, or migration history.

## Structure

```text
src/
├── areas/
│   ├── areas.module.ts
│   ├── areas.controller.ts
│   ├── areas.service.ts
│   ├── dto/
│   │   ├── create-area.dto.ts
│   │   └── area-response.dto.ts
│   └── entities/life-area.entity.ts
├── goals/
│   ├── goals.module.ts
│   ├── goals.controller.ts
│   ├── goals.service.ts
│   ├── dto/
│   │   ├── create-goal.dto.ts
│   │   ├── update-goal.dto.ts
│   │   ├── set-focus.dto.ts
│   │   └── goal-response.dto.ts
│   ├── entities/life-goal.entity.ts
│   └── domain/goal-rules.ts
├── life/
│   ├── life.module.ts
│   ├── life.controller.ts
│   ├── life.service.ts
│   ├── dto/set-vision.dto.ts
│   └── entities/user-life-settings.entity.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   ├── entities/
│   ├── guards/
│   ├── decorators/
│   ├── services/
│   ├── lib/
│   └── types/
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── dto/
│   ├── entities/
│   └── types/
├── common/
│   ├── pipes/non-empty-body.pipe.ts
│   └── user-write-lock/
│       ├── user-write-lock.module.ts
│       └── user-write-lock.service.ts
├── utils/
│   ├── type-guards.ts
│   └── string-transformers.ts
├── config/
├── database/
│   ├── migrations/ (unchanged)
│   ├── data-source.ts
│   └── database-options.ts
├── health/
├── main.ts
└── app.module.ts
```

Only `*.module.ts`, `*.controller.ts`, `*.service.ts` live at the root of each **feature** module. The `health` module has no service because it performs one simple PostgreSQL readiness check.

`Areas`, `Goals`, and `Life` are independent Nest modules, registered individually in `AppModule`. Goal ownership, cross-user parent restrictions, cyclic ancestry checks, focus ordering, and area ownership rules remain in place.

`UserWriteLockModule` is an imported shared infrastructure module, **not** a replacement for the feature modules. It serializes per-user mutations in PostgreSQL.

## Installation after upgrading from v0.3.0

Back up your current repo and database. Merge or replace the source files with this archive. **Do not replace your existing `.env`, and do not delete Docker volumes.** The uploaded `.env` is intentionally excluded from this archive for security.

New packages:

- runtime: `class-validator`, `class-transformer` (standard Nest `ValidationPipe`)
- development: `tsconfig-paths` (resolve `@/` in `ts-node`), `tsc-alias` (rewrite aliases after compiling to JS)

The archive contains the **previous `bun.lock` as a baseline**; it cannot be regenerated here because the package registry is not accessible. **It is outdated relative to the new `package.json` until you run `bun install`.** Do this once on your machine and commit the updated lockfile before Docker builds.

```sh
bun install
bun run typecheck
bun run test
bun run build
bun run db:migrate
bun run start:dev
```

Then, if using Compose:

```sh
docker compose build
docker compose up -d
docker compose ps
```

No new migrations have been introduced. All three original migration files are untouched. Running `db:migrate` again should report no pending migrations if v0.3.0 was already migrated.

## Path alias `@/`

`tsconfig.json` declares:

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": { "@/*": ["*"] }
  }
}
```

Use `import { User } from '@/users/entities/user.entity';` anywhere inside `src`.

A TypeScript compiler path alias is **not** automatically understood by Node.js. To avoid runtime `MODULE_NOT_FOUND`:

- `start:dev`, `db:migrate`, `db:revert`, `db:generate`, and `test` preload `tsconfig-paths/register` together with `ts-node/register`.
- `build` runs `tsc` followed by `tsc-alias`, replacing `@/` paths in compiled `dist/**/*.js` with valid relative `require(...)` paths.
- `start` and `db:migrate:prod` use Node.js directly on compiled JS and do **not** need `tsconfig-paths` in production.

After `bun run build`, check that `.js` files in `dist` no longer contain unresolved `require("@/...")` references.

## Request validation

`main.ts` installs one global `ValidationPipe`:

```ts
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  transformOptions: { enableImplicitConversion: false },
  whitelist: true,
  forbidNonWhitelisted: true,
  stopAtFirstError: true,
  validationError: { target: false, value: false },
}));
```

Body classes live under `<module>/dto/` and use `class-validator` / `class-transformer` decorators.

- Bad types and invalid fields return HTTP 400.
- Extra body fields are rejected, not silently ignored.
- Strings with fields that previously normalized whitespace continue to do so.
- `PATCH /goals/:id` requires at least one property, using a small custom `NonEmptyBodyPipe`.
- Goal UUID route parameters continue using `ParseUUIDPipe`.
- There is no implicit number/string coercion: `"target": "10"` is rejected.

`src/utils/` includes pure `isString`, `isBoolean`, `isRecord`, `isSafeInteger` and normalization helpers. Domain-specific rules (e.g. detecting cycles) remain in their domain module.

## Unchanged API

All paths below use `/api/v1` and authentication rules from v0.3.0:

| Module | Routes |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` |
| Users | `GET /users/me` |
| Areas | `GET /areas`, `POST /areas`, `DELETE /areas/:id` |
| Goals | `GET /goals`, `POST /goals`, `GET /goals/focus`, `PUT /goals/focus`, `GET /goals/:id`, `PATCH /goals/:id`, `DELETE /goals/:id` |
| Life | `GET /life/vision`, `PUT /life/vision` |
| Health | `GET /health/live`, `GET /health/ready` |

A Postman collection is retained under `postman/`.

## Verification status

- Verified: all 58 TypeScript source/test files parse, and all local `@/` and relative imports resolve to existing source paths.
- Not verified in this environment: actual `bun install`, complete Nest TypeScript typecheck, application startup, PostgreSQL migration smoke test, Docker build, end-to-end Postman tests. Dependencies cannot be downloaded here; **run the commands above locally before treating this as a tested release**.

A recommended next improvement is an integration test suite with a disposable PostgreSQL instance, without modifying the frontend.
