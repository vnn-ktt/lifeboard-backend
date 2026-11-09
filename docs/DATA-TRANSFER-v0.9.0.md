# Lifeboard Backend v0.9.0 — Import / Export & Data Integrity

Implementation matches the **real** `LifeState` in frontend `vnn-ktt/lifeboard-frontend` main at `50f52ab` (v0.17.1), including `useLifeStore.exportState()` and `useLifeBackup`.

## API

Every request requires an authenticated `lifeboard.sid` cookie. The account ID is read only from the session, never from the uploaded document. Current prefix: `/api/v1`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/imports/lifeboard-v1/validate` | Strict dry-run; no DB/S3 writes; count assets and detect existing workspace |
| `POST` | `/imports/lifeboard-v1` | Transactional import after explicit confirmation |
| `GET` | `/exports/lifeboard-v1` | Full `LifeState` v1 JSON, with note image data URLs |

### Import steps

1. In the **existing frontend** export `useLifeStore.exportState()` or download JSON via `useLifeBackup`. Browser's `lifeboard:local-profile:v1` and `lifeboard:local-session:v1` are **not credentials for API auth**.
2. Sign into the NestJS backend with `POST /api/v1/auth/login` (real email + password). Use cookies in subsequent requests (`credentials: 'include'`).
3. `POST /api/v1/imports/lifeboard-v1/validate` with the **raw** `LifeState` JSON object as body, *not* `{state: ...}`. Review `canImport`, `warnings`, `counts`, and `snapshotHash`.
4. Show confirmation to the human in the frontend; `POST /api/v1/imports/lifeboard-v1` with the **same raw JSON**, `X-Import-Confirmed: true` and a stable optional `Idempotency-Key` header. Request returns `200` even if retried. Never auto-run this after every login or page load.
5. Save the `idMap` mapping of legacy strings (`dogs-goal`, etc.) to server UUIDs, migrate frontend API references and switch the authenticated account to server-canonical state. **Do not overwrite the imported database from localStorage every page load.**
6. `GET /api/v1/exports/lifeboard-v1` returns the server's full state in frontend-compatible shape; save it to JSON. Original browser data is deliberately not cleared automatically.

### Response examples

Dry run:

```json
{
  "valid": true,
  "snapshotHash": "<sha256-hex>",
  "canImport": true,
  "alreadyImported": false,
  "counts": { "goals": 5, "routines": 2, "checks": 10, "notes": 3, "imageFiles": 1 },
  "warnings": ["Images will be copied to private S3 storage; original browser data is not deleted."]
}
```

The real response also lists zero counts for other collections.

Successful commit:

```json
{
  "importId": "<uuid-v4>",
  "imported": true,
  "snapshotHash": "<sha256-hex>",
  "counts": { "goals": 5, "routines": 2, "checks": 10, "notes": 3, "imageFiles": 1 },
  "idMap": {
    "goals": { "dogs-goal": "<new-uuid-v4>" },
    "routines": {},
    "noteImages": { "legacy-note-id": "<file-uuid-v4>" }
  },
  "importedAt": "2026-11-09T09:00:00.000Z"
}
```

Replaying identical content (even with a different idempotency key) returns the original receipt with `imported: false`. Reusing the same idempotency key for different content returns `409 IDEMPOTENCY_KEY_REUSED`.

### Migration rules

- `LifeState.version === 1`; all required frontend arrays/keys are checked. Extra unknown root or record fields are rejected (no silent loss). Optional v0.15–v0.17 arrays default to empty when absent.
- Source IDs are **not** assumed to be UUIDs. All user-owned entities are assigned new UUIDv4 IDs. Built-in area IDs (`dogs`, `career`, etc.) and system quote IDs (`quote-1`…`quote-11`) stay stable. Parent goals, focus goals, routines, checks (`YYYY-MM-DD|routineId`), metrics, check-ins, milestones, tasks, groups, notes, and status events are remapped within one transaction. Cross-goal milestone assignments are rejected.
- `createdAt` and event timestamps are retained where present. Local date strings `YYYY-MM-DD` remain date-only. Legacy timestamps with no timezone are interpreted as UTC consistently.
- Activity goal progress stays routine-based; measured goal histories and their check-ins stay separate. Old measured goals with no `checkin` start a weekly Sunday schedule from the user's current IANA-local import date, **not** retroactively.
- Legacy custom quotes already stored in `archivedUserQuotes` are preserved separately. System quote catalog is read-only; imported `quotes` are validated but do not replace the server catalogue.
- The profile avatar/email/password and settings in `lifeboard:local-profile:v1` and other browser stores are **not part of** `LifeState` v1; use profile/preference APIs and `/files` for those data.

### Data-integrity guarantees

- Transactional PostgreSQL import: all database rows, or none. Nested SQL FKs enforce user ownership. `user_id` is taken only from `lifeboard.sid` authentication.
- Only an **empty personal workspace** can receive a new snapshot. A nonempty workspace returns `409 ACCOUNT_NOT_EMPTY`; no merge, overwrite or partial import. System areas and user profile/preference defaults do not make the workspace nonempty.
- A committed import receipt stores `user_id`, canonical JSON SHA-256, optional idempotency key, ID maps and collection counts; uniqueness per user prevents duplicate imports. This is a **one-time migration**, not a destructive restore. Re-import after manually deleting all user data still returns the same no-op receipt.
- 5 MB JSON input cap; strict validation of all references, duplicate IDs and dates. Import and export are rate limited.
- Images: each frontend `imageDataUrl` is verified as JPEG, PNG, or WebP (signature + declared MIME), then stored in a **private** S3-compatible object and referenced by an owned `files` row. If the DB transaction fails, uploaded objects are deleted best-effort. S3 is not transactional: a process crash during upload can leave an orphan under `users/<userId>/imports/<importId>/`; operations staff can investigate those prefixes. Existing user files are never modified.
- Export uses one PostgreSQL REPEATABLE READ snapshot; every referenced image must be available, else the export **fails** instead of silently discarding it. Export is capped at 32 MB in-memory for MVP. It includes inline `imageDataUrl` so `LifeState` is portable, but the current frontend backup-import UI itself caps files at **5 MB**: larger exports require a client upgrade or future streaming archive route. Keep regular database/S3 backups independent of this user export.
- API responds `401` when not logged in, `422 INVALID_LIFEBOARD_BACKUP` with a path for broken payload, `409` for conflicts, `428 IMPORT_CONFIRMATION_REQUIRED` for an unconfirmed import, and `413` for oversized requests.

### Limitations

- v0.9 implements *import into an empty account only*. It does not merge, replace, or delete existing server data.
- Binary S3 uploads cannot participate in a SQL transaction; compensation is best-effort and crash cleanup requires operator tooling. No Redis or queues.
- The frontend v0.17.1 currently remains local-first; backend implementation alone does not switch Pinia to server state.
- Browser-only profile avatar/theme/language/session are not embedded in the LifeState v1 export. Migrate them independently.

## SQL / deployment

Migration: `src/database/migrations/1794541200000-CreateDataTransfers.ts` creates `lifeboard_imports` (SHA-256 receipt, idempotency key, map) and `archived_user_quotes`. `synchronize: false` stays unchanged. No existing tables are dropped.

```bash
bun install
bun run typecheck
bun run test
bun run build
bun run db:migrate
TEST_DB_NAME=lifeboard_test bun run test:integration
```

Use a **separate**, disposable PostgreSQL database ending `_test` for integration tests. Test imported images using a fake object-storage provider and optionally smoke-test SeaweedFS/Yandex Object Storage with authorized test data.

**Existing upstream issue:** `main` currently declares `@nestjs/swagger` in `package.json` but its `bun.lock` may be stale. Update the lockfile with Bun before a Docker `--frozen-lockfile` build. v0.9 adds no dependencies.

## CI checks

The PR adds `.github/workflows/backend-ci.yml` (Node.js 24, Bun, PostgreSQL 17). It runs typecheck, unit tests, build and serialized integration tests, then verifies `bun.lock` was not changed by `bun install`. A generated Bun lockfile is uploaded as a CI artifact to make an upstream stale lockfile actionable. The workflow uses disposable CI-only credentials and a fake S3 adapter for import tests; it does not access production credentials or Yandex Object Storage.
