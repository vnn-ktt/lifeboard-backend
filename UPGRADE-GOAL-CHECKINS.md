# Upgrade from v0.6.0 to v0.6.1 — Goal Metrics + Check-ins

1. Save your `.env`, `bun.lock` and a PostgreSQL backup; commit or stash local changes.
2. Apply only files from `lifeboard-v0.6.0-to-goal-checkins-v0.6.1-patch.zip`; do not overwrite old migrations.
3. Run `bun install` and commit the regenerated `bun.lock` (new dependency: `@nestjs/swagger`).
4. Run `bun run typecheck && bun run test && bun run build`.
5. Run `bun run db:migrate` once against PostgreSQL 17+ and `bun run start:dev`.
6. Log in via Postman and test `/api/v1/goal-checkins/due`, `/goals/:id/metrics`, `/goals/:id/checkins`, and `/api/docs-json`.
7. Verify UTC fallback with `GET /users/me` (`timezone: UTC`); set it with `PATCH /users/me/timezone`.

No change to frontend. No cron, queues, Redis or broker.

**Deployment:** run migrations before replacing the API container, and retain database backup for rollback. Reverting the new migration deletes measurement/check-in data; never use rollback in production after users have created entries without an explicit data-loss plan.
