# Upgrade v0.4.0 → v0.5.0

1. Commit your working v0.4.0 branch. Back up PostgreSQL before applying migrations.
2. Apply the **patch archive** to your project root. It contains `src/reviews/`, the new migration, modifications to `src/app.module.ts`, `package.json`, `tests/architecture.test.ts`, and new tests. Do not overwrite your `.env` or `bun.lock`.
3. Run:

```bash
bun install
bun run typecheck
bun run test
bun run build
bun run db:migrate
bun run start:dev
```

4. Sign in using `POST /api/v1/auth/login` (Postman will retain `lifeboard.sid`). Then test:

```text
PUT    /api/v1/reviews/2026-11-05
GET    /api/v1/reviews/2026-11-07
GET    /api/v1/reviews?from=2026-11-01&to=2026-11-30
DELETE /api/v1/reviews/2026-11-05
GET    /api/v1/reviews/2026-11-05    -> 404
```

`PUT` payload: `{"wins":"Good week","obstacles":"Few setbacks","nextStep":"Keep going","mood":8}`. Different dates of same week address the same review.

Existing tables and migrations are unchanged; only a new `weekly_reviews` table is added. **Never run `docker compose down -v` to upgrade**, since that destroys DB data. The migration `down` removes `weekly_reviews` and its records; don't revert if you want to keep review data.

The full archive is a clean snapshot based on the previously provided v0.4.0; it does not include your local environment or `bun.lock`.
