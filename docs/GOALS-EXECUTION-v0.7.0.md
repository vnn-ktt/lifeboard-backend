# Lifeboard Backend v0.7.0 — Goals Execution

Implemented against frontend integration contract **v0.17.1**. The frontend remains unchanged. This change is **additive** to backend v0.6.1: do not modify old migrations or import browser `localStorage` without explicit user approval.

## What changed

- Three modules: `MilestonesModule`, `TasksModule`, `GoalStatusModule`. DTOs and entities live in their own directories; import aliases use `@/`.
- Existing `LifeGoal` now includes `status` (`active | paused | completed | cancelled`, default `active`) and server-set `completedAt`.
- Status transitions are serialized by `UserWriteLock`; status and event insert occur in the **same transaction**. Repeating the same status creates no event. Historical status events are not invented for existing goals.
- Measured goal check-ins are exposed only for `active` goals. Switching back to `active` reactivates the check-in schedule no earlier than the user's local current date, preserving prior history.
- Milestone deletion **detaches** tasks using PostgreSQL 17 composite FK `ON DELETE SET NULL (milestone_id)`, while deleting the parent goal cascades its milestones, tasks and status history.
- `measurement.kind` from frontend v0.17.1 and legacy `measurement.type` from v0.6.1 are both accepted by the Goals DTO; internally PostgreSQL retains `type`. API responses include **both** `kind` and `type` to avoid breaking older clients. Round-trip requests may contain both as long as the discriminators match.
- `LifeGoal.target` remains the routine completion plan. Completing a task or milestone does **not** change outcome percentage. Fixed `startDate` and `dueDate` now override rolling horizon bounds for routine progress when both are present.

## REST API

All routes are under `/api/v1`, authenticated via HttpOnly `lifeboard.sid` cookie.

| Method | Route | Notes |
| --- | --- | --- |
| PATCH | `/goals/:goalId/status` | `{ "status": "paused" }` -> full updated Goal; idempotent, only real transitions logged |
| GET | `/goals/:goalId/status-events?limit=30&cursor=...` | Array ordered newest first; opaque continuation cursor in `X-Next-Cursor` response header, absent at end |
| GET/POST | `/goals/:goalId/milestones` | List ordered by `order`, `createdAt`, `id`; create with `title`, `order`, optional `description`, `dueDate` |
| PATCH/DELETE | `/goals/:goalId/milestones/:milestoneId` | Delete detaches tasks rather than deleting them |
| PUT | `/goals/:goalId/milestones/:milestoneId/completion` | `{ "completed": true }`; repeated completion keeps original timestamp |
| GET/POST | `/goals/:goalId/tasks` | Goal-owned tasks; optional `milestoneId` must belong to same goal |
| PATCH/DELETE | `/goals/:goalId/tasks/:taskId` | Update title, description, dueDate, milestoneId; null to clear optional fields |
| PUT | `/goals/:goalId/tasks/:taskId/completion` | `{ "completed": false }` clears timestamp; same-value retries are idempotent |
| GET | `/tasks/due?date=YYYY-MM-DD` | Open overdue/due and unscheduled tasks of **active** goals; date is required |

Date-only values remain literal local `YYYY-MM-DD`. `completedAt`, `createdAt`, and `changedAt` are UTC ISO 8601 timestamps. Task and milestone `dueDate` may be absent; API omits the field when absent and emits `completedAt: null` for an open item. `title` length 2–90, `description` length <= 500, `order` integer 0–10000. Input DTOs require no additional dependencies.

Status timeline endpoint returns an **array**, matching the v0.17.1 example. For a paginated next page, send the opaque `X-Next-Cursor` header value as `cursor` query parameter. The client must read this response header through the same-origin proxy; the CORS configuration explicitly exposes `X-Next-Cursor`.

## Upgrade / testing

```bash
bun install
bun run typecheck
bun run test
bun run build
bun run db:migrate
bun run start:dev
```

Run the PostgreSQL integration tests only against a **separate** database whose name ends in `_test` and is not equal to `DB_NAME`:

```bash
TEST_DB_NAME=lifeboard_test bun run test:integration
```

Unit tests validate DTOs, measurement compatibility, status transitions/idempotency, ownership, milestone deletion semantics, completion toggles and cursor parsing. PG tests exercise FK ownership, cascading, detaching, and transactional status rollback. The migration initializes old goals with `status='active'` and a null `completedAt`, without writing fabricated timeline events.

Swagger: `/api/docs` (JSON: `/api/docs-json`). Postman: `postman/Lifeboard-v0.7.0-goals-execution.postman_collection.json`.

**Known remaining MVP work:** proper JSON import and ID mapping for `dogs-goal` style seed IDs; Notes, Quotes, profile/preferences, Helper; API-client wiring; end-to-end cookie/CSRF and deployment tests. API version remains `/api/v1`.
