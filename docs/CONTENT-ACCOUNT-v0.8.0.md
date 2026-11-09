# Lifeboard Backend v0.8.0 — Notes, Quotes, Profile & Preferences

Source of truth: `Lifeboard-backend-contracts-v0.17.1.md` (8 Nov 2026). This is an **additive** server release built on v0.7.0. Existing auth, metrics, check-ins, goals, tasks, routines and files remain unchanged.

## Contracts (`/api/v1` prefix)

All routes require the existing HttpOnly `lifeboard.sid` cookie. No user ID may be supplied in a request as authority.

| Method | Route | Payload |
| --- | --- | --- |
| GET / POST | `/note-groups` | POST `{name, goalId?: UUID\|null, color?: '#rrggbb'}` |
| PATCH / DELETE | `/note-groups/:id` | PATCH partial `{name?,goalId?,color?}` |
| GET / POST | `/notes` | GET filters `groupId`, `goalId`, `pinned`; POST `{title,content?,groupId?,goalId?,imageFileId?,pinned?}` |
| GET / PATCH / DELETE | `/notes/:id` | PATCH partial fields, nullable references detach |
| GET | `/quotes` | System catalog, read-only, 11 stable `quote-*` IDs |
| GET / PUT | `/quotes/assignments` | PUT partial `{dashboard?: string\|null, review?: string\|null}` |
| GET / PATCH | `/users/me` | PATCH `{name?,nickname?,about?}`; email cannot be changed here |
| PUT | `/users/me/avatar` | `{fileId: UUID\|null}`; null clears |
| GET / PUT | `/users/me/preferences` | PUT partial `{theme?,language?,goalEntryMode?,showHelper?,privacy?:{showAvatar?,maskStats?}}` |
| POST | `/files` | Existing `multipart/form-data` image upload; response includes `id` |
| GET | `/files/:id/content` | Existing protected binary endpoint |

`imageDataUrl` is **not** accepted as input: upload the image with POST /files, then use `imageFileId` in the Note. Response has `imageFileId` and relative, same-origin `imageUrl` (`/api/v1/files/:id/content`). Avatar uses the same upload + `PUT /users/me/avatar` workflow, returning `avatarFileId` and `avatar` URL. URLs require an authenticated browser session.

Quote catalog fields match the frontend seed shape: `id,text,author,sourceTitle,sourceUrl,reference,createdAt,createdBy:'seed'`. Assignments default to dashboard=`quote-5`, review=`quote-11`, but an explicit null hides a placement. User cannot create/edit system quotes. Migration seeds all 11 with stable IDs. No API to modify the catalog.

## DB & ownership

Migration `1794454800000-CreateContentAndPreferences.ts` adds:

- `note_groups` and `notes` with composite `(id,user_id)` FKs, `ON DELETE SET NULL (column)` for group/goal/file references.
- `system_quotes` (11 translated seed entries) and per-user `quote_assignments` (2 placement keys).
- `user_preferences` (typed columns; server validates enums and booleans).
- `users.avatar_file_id` (owned file FK), `files` composite `(id,user_id)` uniqueness.

Each write runs inside the existing `UserWriteLock` (PostgreSQL transaction). Nested goal/group/file references must belong to the authenticated user; nonexistent or foreign IDs return 404. Deleting a note never deletes its S3 image, which may be referenced elsewhere. A hard deletion of a file unlinks the related notes and avatar at DB level; a soft-deleted file cannot be selected for new links.

**Important:** uploaded files must be backed up separately from PostgreSQL. Local SeaweedFS and production Yandex Object Storage both use the existing FilesModule.

## Compatibility and scope

- The frontend 0.17.1 still stores local `imageDataUrl` fields. Automatic conversion of those values during login would be unsafe and is not implemented; one-time migration belongs to v0.9.0.
- `privacy` flags follow the existing frontend privacy store (`showAvatar`, `maskStats`). Additional privacy controls require an explicit new contract.
- Existing users receive virtual default preferences until they customize a setting; the migration does **not** overwrite account records.
- Existing notes/quotes in browser localStorage are not silently imported.
- Does not change cookies, authentication strategy, or change frontend code.

## Local verification

```bash
bun install
bun run typecheck
bun run test
bun run build
bun run db:migrate
TEST_DB_NAME=lifeboard_test bun run test:integration
bun run start:dev
```

`TEST_DB_NAME` **must** be a dedicated PostgreSQL database ending `_test` and distinct from `DB_NAME`. Do not run integration tests against production. Use `postman/Lifeboard-v0.8.0-content-account.postman_collection.json` to exercise API after login.

**Known existing blocker:** main's `bun.lock` does not yet include `@nestjs/swagger` although it is in `package.json` since v0.6.1. Before building Docker with `--frozen-lockfile`, run `bun install` with registry access and commit the refreshed `bun.lock`. This release adds no new npm dependencies.
