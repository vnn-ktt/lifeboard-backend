# Lifeboard Backend v0.6.1 — Private File Storage

NestJS 11 · PostgreSQL 17 · TypeORM · Bun · Node.js 24 runtime · AWS SDK v3 · S3-compatible storage. Existing frontend remains unchanged.

## What's new

- `StorageModule`: provider-neutral `StorageService` backed by `S3StorageProvider` (`@aws-sdk/client-s3`).
- `FilesModule`: upload, private download, metadata and deletion of JPEG / PNG / WebP images (up to **5 MiB**).
- PostgreSQL migration `1794109200000-CreateFiles.ts`: file metadata and user ownership; **no file bytes** in PostgreSQL.
- Development-only `compose.storage.dev.yaml`: SeaweedFS in Docker with persistent data and pre-created private S3 bucket.
- Production: Yandex Object Storage, using the **same** S3 provider and REST API with different environment variables.
- `bun run files:cleanup`: retries deletion of orphaned objects after an interrupted cleanup (soft-deletion tombstones).
- Postman collection and tests. No changes to existing migrations, endpoints or frontend.

## Module structure

```text
src/
├── files/
│   ├── domain/image-rules.ts
│   ├── dto/file-response.dto.ts
│   ├── entities/stored-file.entity.ts
│   ├── files.controller.ts
│   ├── files.module.ts
│   └── files.service.ts
├── storage/
│   ├── interfaces/object-storage.interface.ts
│   ├── providers/s3-storage.provider.ts
│   ├── storage.module.ts
│   └── storage.service.ts
└── cli/cleanup-files.ts
```

The root of each feature module contains only its controller/service/module, and StorageModule intentionally has **no controller**. Imports are `@/` aliases. `FilesModule` does not call AWS SDK directly.

## Develop locally (Bun on host, SeaweedFS and PostgreSQL in Docker)

1. Read `UPGRADE.md`, back up PostgreSQL, and add the new `S3_*` variables from `.env.example` to your existing `.env` (do **not** replace DB credentials).
2. Start DB and S3 emulator:

```bash
docker compose -f compose.yaml -f compose.storage.dev.yaml up -d db storage
```

3. Run backend:

```bash
bun install
bun run typecheck
bun run test
bun run build
bun run db:migrate
bun run start:dev
```

S3 dev endpoint: `http://127.0.0.1:8333`. The `storage` container creates bucket `lifeboard-dev` and local access keys automatically; the bucket and objects survive container restarts in the `seaweedfs_data` volume. Do not publish this service to the internet.

For **all-in-Docker development**, use:

```bash
docker compose -f compose.yaml -f compose.storage.dev.yaml up -d --build
```

The overlay sets `S3_ENDPOINT=http://storage:8333` for the API; inside Docker `127.0.0.1` would refer to the API container, not SeaweedFS. In production, **do not include the overlay**.

If PostgreSQL is already running in Docker, preserve its volume. Never run `docker compose down -v` during an upgrade.

## Production: Yandex Object Storage

1. In Yandex Cloud create a **private** Object Storage bucket (public access disabled). Create a service account with narrowly scoped rights to read/write/delete objects in that bucket and generate a **static access key** for it. See official Yandex docs: https://yandex.cloud/ru/docs/storage/tools/aws-sdk-js and https://yandex.cloud/ru/docs/storage/s3/s3-api-quickstart .
2. Configure production `.env` or secret manager (never commit secrets):

```dotenv
NODE_ENV=production
S3_ENDPOINT=https://storage.yandexcloud.net
S3_REGION=ru-central1
S3_BUCKET=<your-private-bucket-name>
S3_ACCESS_KEY_ID=<service-account-static-access-key-id>
S3_SECRET_ACCESS_KEY=<service-account-static-secret>
S3_FORCE_PATH_STYLE=true
COOKIE_SECURE=true
```

3. Start with base `compose.yaml` only, behind HTTPS reverse proxy (set `WEB_ORIGIN` to frontend origin). The bucket must exist before uploading; the application never creates buckets or sets public ACLs.
4. Use encrypted secrets storage, bucket versioning / retention policy as appropriate, S3 access logs, and PostgreSQL backups. **File backups and DB backups must be coordinated** since DB stores keys rather than data. Never copy local development S3 credentials to production.

`S3_ENDPOINT` is validated on startup; production requires HTTPS. The region and URL follow Yandex's official SDK examples.

## REST API

All routes below use prefix `/api/v1` and require the existing **HttpOnly session cookie**. The `userId` is derived from the server-side session and cannot be supplied by clients.

| Method | Endpoint | Result |
|---|---|---|
| `POST` | `/files` | `201` uploads one `multipart/form-data` part named **`file`** |
| `GET` | `/files/:id` | `200` metadata or `404` |
| `GET` | `/files/:id/content` | `200` image stream (`Cache-Control: private, no-store`) |
| `DELETE` | `/files/:id` | `204`, then metadata/content return `404` |

Upload accepts JPEG, PNG and WebP, up to 5 MiB; validates the binary signature rather than trusting `Content-Type` or the extension. Executable/SVG/GIF are rejected. Max one file and no other form fields. Upload requires the `file` field; `application/json` is not accepted.

Example `201` JSON:

```json
{
  "id": "fc0d58b0-5c86-44e5-a6f4-035d3bd8f0d3",
  "originalName": "landscape.png",
  "mimeType": "image/png",
  "size": 154239,
  "createdAt": "2026-11-05T12:00:00.000Z"
}
```

Storage keys, S3 credentials, bucket and internal URLs are **not** exposed. If the file is not owned by the signed-in user, return `404` instead of revealing its existence. Uploaded objects have random UUID keys. Content is delivered by the API; no public bucket or presigned URL is issued.

### Test in Postman

Import `postman/Lifeboard-v0.6.0.postman_collection.json` and use its Auth → Login first; Postman retains session cookies for `localhost`. In Files (S3), choose an actual image in request **01 Upload image** → Body → form-data → `file` (type File). Send; the test script saves `fileId`. Run metadata, download, delete and finally `404` checks. Test a different session, invalid image and files over 5 MiB.

Or test using curl after logging in:

```bash
curl -i -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"ivan@example.com","password":"YOUR_PASSWORD"}' \
  http://localhost:3000/api/v1/auth/login
curl -i -b cookies.txt -F 'file=@./photo.png' http://localhost:3000/api/v1/files
curl -b cookies.txt http://localhost:3000/api/v1/files/FILE_ID/content --output downloaded.png
curl -i -b cookies.txt -X DELETE http://localhost:3000/api/v1/files/FILE_ID
```

## Deletion consistency and maintenance

Deletion first soft-deletes metadata so the user immediately loses access, then requests S3 delete, then hard-deletes metadata. If storage is down, a soft-deleted record remains for retry. Run `bun run files:cleanup` after restoring S3 connectivity (or in production: `node dist/cli/cleanup-files.js`). This is a **manual maintenance command**, not a scheduled worker. A PostgreSQL failure after a successful S3 upload triggers a best-effort compensating S3 delete; administrators should still monitor for orphans after infrastructure outages.

**v0.6.0 handles files independently.** It does not yet attach `fileId` to Notes or Users avatars. Linking will be implemented in Notes/Profile modules. Future work: full image decoders/transcoding, malware scanning, quotas, content hashing, rate limits tailored for uploads and integration tests against real S3/PostgreSQL; this release uses signature checks and bounded in-memory uploads only.

## Verification

The source and Postman collection are included. Run `bun install && bun run typecheck && bun run test && bun run build && bun run db:migrate` locally before deployment; the distributed archive intentionally does not contain generated `bun.lock` or `node_modules`. Commit the locally generated `bun.lock` and keep it frozen in Docker. Live S3 uploads and PostgreSQL migration need your local runtime to validate end to end.

---

# Goal Metrics + Weekly Check-ins — Backend v0.6.1 (2026-11-06)

This release is an **additive change to the existing NestJS modular monolith** (v0.6.0). It does not modify the Vue frontend, rewrite Auth/Users/Goals, or drop existing data. The Swagger dependency (`@nestjs/swagger`) is new. Use **Bun** to install and run scripts.

## Schema and module boundaries

- `goals/`: existing `LifeGoal`, now with `measurement` (`activity`, `binary`, `numeric`), optional `startDate` / `dueDate`, and check-in schedule mapped to typed columns (`checkin_frequency`, `checkin_weekday`, `checkin_from_date`). `target` **still means planned routine completions**.
- `goal-metrics/`: dated result measurements in `goal_metric_entries`. Latest measurement by `(date, createdAt, id)` determines numeric/binary outcome; deletions are supported.
- `goal-checkins/`: completed facts in `goal_checkins`, and `CheckinScheduleService` for on-demand due-date calculation. `unchanged` and `skipped` never insert a metric.
- `users/`: IANA `timezone`, defaults to **UTC** (never depends on host machine time zone).
- `progress/`: existing routine progress retained in `activity`; main `percent` and `outcome` now use the result measurement where applicable.

Ownership is enforced by both services (`userId` from HttpOnly session) and composite PostgreSQL foreign keys. `UNIQUE(goal_id, due_date)` prevents duplicate completed check-ins. FK from a completed check-in to an individual metric is nullable and `ON DELETE SET NULL (metric_entry_id)`; deleting the metric retains the check-in history. Deleting a goal cascades both histories.

The migration `1794282000000-CreateGoalMetricsAndCheckins.ts` does not delete old goals. Goals without a measurement become `activity`. If the DB already contains measured goals without a schedule, their schedule is initialized from **migration day in the user's timezone**, weekly/Sunday, without historical overdue dates. The migration expects **PostgreSQL 17+**, as does the older composite `ON DELETE SET NULL` migration.

## REST contract (all endpoints under `/api/v1`, authenticated)

| Method | Path | Purpose |
| --- | --- | --- |
| GET/POST | `/goals/:goalId/metrics` | List/add dated manual measurements |
| DELETE | `/goals/:goalId/metrics/:entryId` | Remove a measurement; check-in remains |
| GET | `/goal-checkins/due` | Earliest pending per goal, with additional `pendingCount` |
| GET | `/goals/:goalId/checkins` | Completed history |
| POST | `/goals/:goalId/checkins` | Close the **earliest** pending scheduled date |
| PATCH | `/users/me/timezone` | Change IANA timezone `{ "timezone": "Europe/Amsterdam" }` |
| GET | `/goals/:goalId/progress` | Outcome as well as existing routine progress |
| POST/PATCH | `/goals`, `/goals/:goalId` | Extended with `measurement`, `startDate`, `dueDate`, `checkin` |

The new measurement field in goal create/update takes one of:

```json
{"type":"activity"}
{"type":"binary"}
{"type":"numeric","direction":"increase","unit":"USD","startValue":20000,"targetValue":100000}
```

New numeric/binary goals default to `{ "frequency":"weekly", "weekday":7, "fromDate":"<today in user timezone>" }`. Pass `checkin` explicitly to choose `daily`, `weekly`, `manual`, or `off` (including `fromDate`). On frequency/weekday changes the activation resets to **today** (or a later supplied date); past completed rows are retained. A weekly completion covers the whole **ISO week**, including if the chosen weekday changes, so one week is not double-counted. No future scheduled rows are written to the database.

Examples:

```http
POST /api/v1/goals/{goalId}/checkins
Content-Type: application/json

{"dueDate":"2026-11-08","status":"updated","value":35000,"note":"Deposit"}
```

```http
POST /api/v1/goals/{goalId}/checkins
Content-Type: application/json

{"dueDate":"2026-11-08","status":"unchanged"}
```

```http
POST /api/v1/goals/{goalId}/checkins
Content-Type: application/json

{"dueDate":"2026-11-08","status":"skipped"}
```

`updated` writes both a measurement (dated **actual local completion date**, not scheduled due date) and a check-in in one transaction. Numeric updated requires `value`; binary updated always records `1` (value may be omitted). The `note` is limited to 300 characters. Other statuses are check-in-only. The same exact request is idempotent; a conflicting retry returns `409`.

`GET /goal-checkins/due` returns items like:

```json
[{"goalId":"<uuid>","dueDate":"2026-11-08","overdue":false,"pendingCount":2,
  "outcome":{"type":"numeric","percent":18.75,"completed":false,"currentValue":35000,
    "startValue":20000,"targetValue":100000,"unit":"USD","direction":"increase"}}]
```

`pendingCount` counts **additional pending dates** beyond the one in `dueDate`. When the latest result is 100%, the endpoint returns no pending reminder for that goal until the result changes. Historical check-ins are still readable.

## Migrations, build, testing

```bash
bun install
bun run typecheck
bun run test
bun run build
bun run db:migrate
bun run start:dev
```

Inspect `bun.lock` before committing and never overwrite `.env` or the PostgreSQL volume. For a real PostgreSQL integration test, provision a **separate** database ending `_test` with the same Postgres user credentials and run:

```bash
# Example: create one-time dedicated test DB, not the application DB
# docker compose exec db psql -U lifeboard -d postgres -c 'CREATE DATABASE lifeboard_test;'
TEST_DB_NAME=lifeboard_test bun run test:integration
```

The integration test runs migrations in the dedicated test database and checks atomic rollback, ownership, uniqueness, FK `SET NULL`, and cascade deletion. Do **not** point `TEST_DB_NAME` at a database holding application data. HTTP session/auth tests still need a full deployment environment.

OpenAPI UI: `GET /api/docs`; JSON specification: `GET /api/docs-json`. Postman collection: `postman/Lifeboard-Goal-Checkins-v0.6.1.postman_collection.json`. Swagger UI is documentation; for cookie-authenticated unsafe requests the origin restriction configured in `main.ts` may block “Try it out” from the backend origin. Postman uses the normal session cookie without a browser Origin header.

### Upgrade caveats

- The frontend v0.15.1 source archive was not present in the available files during this backend update; the frontend's v0.15.1 README and the supplied API/data-model specification were used. Check the exact discriminated `GoalMeasurement` TypeScript shape against `types.ts` before connecting the frontend.
- The code and isolated calendar tests were checked without installing new npm packages; complete compilation, test suite, PostgreSQL migration, and live HTTP contract must be validated locally using Bun.
- Existing JSON backups need a separate import pipeline; this change does **not** automatically import browser `localStorage` into PostgreSQL.


## v0.7.0 — Goals Execution (frontend v0.17.1 contract)

- Modules: `milestones`, `tasks`, `goal-status`; goal status and completion metadata added to existing `life_goals`.
- Atomic and idempotent status events; milestone and task CRUD/completion; Today `/tasks/due` API.
- `measurement.kind` requests accepted alongside legacy `measurement.type` with normalized storage.
- Detailed REST contract and migration/testing guidance: [`docs/GOALS-EXECUTION-v0.7.0.md`](docs/GOALS-EXECUTION-v0.7.0.md).
- Postman: `postman/Lifeboard-v0.7.0-goals-execution.postman_collection.json`.
- New migration: `1794368400000-CreateGoalExecution.ts` (additive; old goals remain `active`, no synthetic events).

This release does not automatically connect frontend localStorage, and the existing frontend is not modified.
