# Upgrade v0.8.0 → v0.9.0

1. Use a real backend account with `lifeboard.sid`; local email-only browser login cannot authenticate the API.
2. Back up PostgreSQL **and** S3 before running migrations.
3. `bun install && bun run typecheck && bun run test && bun run build`.
4. `bun run db:migrate` (adds `lifeboard_imports` and `archived_user_quotes`, no existing tables removed).
5. `TEST_DB_NAME=lifeboard_test bun run test:integration` on a separate disposable test DB.
6. Import Postman collection `postman/Lifeboard-v0.9.0-data-transfer.postman_collection.json`.
7. Dry-run a **raw** `LifeState` v1 JSON, review `canImport`, then explicitly confirm with `X-Import-Confirmed: true`.
8. Save returned `idMap` for frontend local ID → UUID migration. Never merge data into an already-populated backend account.
9. Verify a complete `GET /exports/lifeboard-v1` round trip, including note images, before switching the frontend's source of truth.

**Known upstream lockfile issue:** The current `bun.lock` can lack the already-existing `@nestjs/swagger` dependency; refresh lockfile before frozen Docker builds. New v0.9 code introduces no new packages.
