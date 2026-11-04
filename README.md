# Lifeboard Backend v0.4.0 — Routines & Progress

NestJS 11 · TypeScript · PostgreSQL 17 · TypeORM · REST · Bun package manager · Node.js 24 runtime.

**Frontend v0.14.1 is unchanged.** This release builds on **v0.3.1 modular** and adds routines, occurrence checks, and server-side progress calculations. All previous Auth, Areas, Goals, Life, and Health routes remain available.

## Upgrade from v0.3.1

Read [UPGRADE.md](UPGRADE.md). Prefer the patch archive if you have local modifications.

1. Commit/backup your current code and PostgreSQL data.
2. Merge the new files. Keep your own `.env` and `bun.lock` (no new dependencies required).
3. Apply the **one new** migration; do **not** recreate the database volume.

```bash
bun install
bun run typecheck
bun run test
bun run build
bun run db:migrate
bun run start:dev
```

For Docker deployments: `docker compose build && docker compose up -d` (Compose runs migrations before API). Use Docker only if you already run this project with Docker. Do not execute `docker compose down -v`: it deletes database data.

## Project structure

```text
src/
├── areas/         dto/ entities/ + areas.{module,controller,service}.ts
├── goals/         dto/ entities/ domain/ + goals.{module,controller,service}.ts
├── life/          dto/ entities/ + life.{module,controller,service}.ts
├── auth/          dto/ entities/ guards/ decorators/ services/ lib/ types/
├── users/         dto/ entities/ types/
├── routines/      dto/ entities/ domain/ + routines.{module,controller,service}.ts      NEW
├── progress/      dto/ domain/ + progress.{module,controller,service}.ts                NEW
├── common/        decorators/is-date-key.decorator.ts, pipes/
├── utils/         date-key.ts, type-guards.ts, string-transformers.ts
├── database/      data-source.ts, database-options.ts, migrations/
├── config/
├── health/
├── app.module.ts
└── main.ts
```

- In each feature module's root: **only** `*.module.ts`, `*.service.ts`, `*.controller.ts`.
- Imports via `@/...` (`tsconfig-paths` in dev, `tsc-alias` in build).
- Existing global `ValidationPipe` rejects unknown fields and implicit coercions.
- `RoutinesModule` owns routine CRUD and date-scoped checks.
- `ProgressModule` owns aggregates; it is read-only and does not import `RoutinesModule` or `GoalsModule`.
- Both modules use existing Auth guard, extracting user ID from the session, never from client payload.

## Database migration

New migration: `1793936400000-CreateRoutinesAndChecks.ts`.

- `life_routines`: UUID ID, user, parent goal, title/description, `time` as **HH:mm**, `days` as ISO weekday integers **1=Mon..7=Sun**, `duration_minutes`.
- `routine_checks`: `(routine_id, date)` composite primary key; the row means `true`, its absence means `false`.
- Cross-user goal/routine associations are forbidden by composite foreign keys; goal/routine deletion cascades checks. Existing tables and migrations are untouched.
- Indexed by user/date and goal, with database checks for time, weekday range, and duration.
- Repeating `PUT` with `done: true` is idempotent. Setting `false` deletes the row (also idempotent).

> Date-only fields use strict `YYYY-MM-DD` Gregorian dates, never timestamps. No timezone conversion is performed for occurrences. Clients should pass their local calendar date; when `at` is omitted, goal progress defaults to today's **UTC** date. Future user-timezone settings can be introduced separately.

## REST routes

All routes below are prefixed with `/api/v1` and **require the HttpOnly session cookie**.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/routines?goalId=<uuid>` | All routines or routines for a goal (owner only) |
| POST | `/routines` | Create a routine |
| GET | `/routines/:id` | Get routine |
| PATCH | `/routines/:id` | Partial update, rejects `{}` |
| DELETE | `/routines/:id` | Delete routine and its checks (204) |
| GET | `/routines/day?date=YYYY-MM-DD` | Planned routines + `done` flags and daily stats |
| GET | `/routines/checks?from=YYYY-MM-DD&to=YYYY-MM-DD` | Completed checks (up to **366 days** inclusive) |
| PUT | `/routines/:id/checks/:date` | Mark/unmark, `{ "done": true / false }` |
| GET | `/goals/:id/progress?at=YYYY-MM-DD` | Completed occurrences during this goal's horizon |
| GET | `/progress/week?date=YYYY-MM-DD` | Monday–Sunday statistics, daily breakdown |

Existing v0.3.1 routes continue to work: `/auth/*`, `/users/me`, `/areas`, `/goals`, `/goals/focus`, `/life/vision`, `/health/*`.

### Create routine

**POST** `/api/v1/routines`

```json
{
  "goalId": "<a goal UUID owned by the signed-in user>",
  "title": "Утренняя прогулка",
  "description": "Прогулка и тренировка",
  "time": "07:25",
  "days": [1, 2, 3, 4, 5, 6, 7],
  "durationMinutes": 40
}
```

`goalId` must be a v4 UUID from the Goals API (not the frontend demo IDs). The response uses the exact `LifeRoutine` JSON keys from frontend `types.ts`, plus server-generated `id`.

### Set completion

**PUT** `/api/v1/routines/<routineId>/checks/2026-11-05`

```json
{ "done": true }
```

Returns `{ "routineId": "...", "date": "2026-11-05", "done": true }`. Repeat the same request without creating duplicates; `{ "done": false }` removes the check. Marking a date is permitted even if the routine is not scheduled that day, matching the old Pinia behavior.

### Read completed checks

**GET** `/api/v1/routines/checks?from=2026-11-01&to=2026-11-30`

```json
{ "checks": { "2026-11-05|<routineId>": true } }
```

This key format matches frontend's existing `LifeState.checks`. Every key ends in a server UUID rather than a `demo-*` string.

### Read day plan

**GET** `/api/v1/routines/day?date=2026-11-05`

```json
{
  "date": "2026-11-05",
  "routines": [
    { "id": "...", "goalId": "...", "title": "Утренняя прогулка", "description": "Прогулка и тренировка", "time": "07:25", "days": [1, 2, 3, 4, 5, 6, 7], "durationMinutes": 40, "done": true }
  ],
  "stats": { "done": 1, "total": 1, "percent": 100, "durationMinutes": 40 }
}
```

### Goal progress

**GET** `/api/v1/goals/<goalId>/progress?at=2026-11-05`

```json
{
  "goalId": "...",
  "at": "2026-11-05",
  "period": { "from": "2026-11-01", "toExclusive": "2026-12-01" },
  "done": 1,
  "target": 20,
  "percent": 5
}
```

The date period depends on the goal's `horizon`. Like frontend `getGoalProgress()`, `done` counts all **completed routine occurrences** belonging to the goal inside the period; `target` remains the goal's chosen threshold. `percent` is rounded and capped at 100. Goal ancestry does **not** aggregate descendant routines. `five-years` deliberately starts Jan 1 of `at` year and ends Jan 1 of `at + 5` years, mirroring the current frontend calculation; this can be revisited with a new contract later.

**GET** `/api/v1/progress/week?date=2026-11-05` returns `{ weekStart, done, total, percent, days: [{ date, done, total, percent }] }`, with a calendar week beginning Monday. Only scheduled occurrences count toward *daily/weekly* stats; unlike those stats, goal progress counts every completed check (including off-schedule).

## Postman testing

Import `postman/Lifeboard-v0.4.0.postman_collection.json`. Login in the Auth folder (Postman retains the session cookie), then create a goal in the Goals folder; `childGoalId` will be captured automatically. Run the Routines folder top-to-bottom; it creates, modifies, checks, unchecks, and deletes a routine. The Progress folder contains reusable queries; the Routines sequence also verifies progress while a completion exists. For cross-user checks, login as a different user and verify foreign IDs return 404.

## Verification

- Source syntax, `@/` import destinations, root-module structure, and pure date/progress rules were checked offline.
- DTO validation, full `bun run typecheck`, Nest app startup, PostgreSQL migration and Postman end-to-end requests **must be verified on your machine** with installed dependencies and PostgreSQL. No package registry or container runtime is available in this environment.
- No new npm or Bun dependencies were added. Keep your current up-to-date `bun.lock` from your local v0.3.1 repository. The full snapshot intentionally omits a stale lockfile; run `bun install` to generate one before `docker compose build`.
