# Lifeboard Backend v0.6.0 — Private File Storage

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
