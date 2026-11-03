# Lifeboard Backend v0.1.0

Minimal NestJS modular monolith infrastructure for Lifeboard Frontend v0.14.1.
No frontend files are modified. No user/domain tables or authenticated endpoints exist yet.

## Requirements

- Node.js 24, npm 10+, Docker Engine with Compose v2.
- PostgreSQL 17 in Docker.

## Development

```bash
cp .env.example .env
# Change DB_PASSWORD in .env before use.
docker compose up -d db
npm install
npm run db:migrate
npm run start:dev
```

Windows PowerShell: `Copy-Item .env.example .env` instead of `cp`.

Endpoints:
- `GET http://localhost:3000/api/v1/health/live` => HTTP 200 `{ "status": "ok" }`
- `GET http://localhost:3000/api/v1/health/ready` => HTTP 200 `{ "status": "ok", "database": "up" }` when PostgreSQL is available; HTTP 503 otherwise.

## Everything in Docker

```bash
cp .env.example .env
# Replace DB_PASSWORD with a strong secret.
docker compose up --build -d
curl http://localhost:3000/api/v1/health/ready
```

`migrate` is a one-shot job, and `api` starts only after the job succeeds. `db` and `api` are only mapped to localhost. Production hosting needs a reverse proxy with HTTPS and secret management.

## Migrations

- Development: `npm run db:migrate` (Node reads `.env` before the TypeORM CLI is executed).
- Roll back one migration: `npm run db:revert`.
- Generate after entities exist: `npm run db:generate -- src/database/migrations/DescriptiveName`.
- From compiled Docker image: `npm run db:migrate:prod` (receives environment variables from Compose).

The baseline migration records successful initialization, without creating premature domain tables. TypeORM creates `typeorm_migrations` for tracking.

**Never enable `synchronize` or `migrationsRun` at application startup.** Apply migration changes before deploying the new API version. Only run a single migration job at a time.

## Repository layout

```
src/
  main.ts
  app.module.ts
  config/environment.ts
  database/
    database-options.ts
    data-source.ts
    migrations/
  health/
    health.module.ts
    health.controller.ts
```

## Dependencies and locking

This archive was assembled in a sandbox without access to the npm registry. It cannot contain a resolved `package-lock.json`. On the first network-connected machine, run `npm install` and commit the generated `package-lock.json`. Then **replace** `npm install --no-audit --no-fund` in the Dockerfile with `npm ci --no-audit --no-fund` before using this image for production releases. Build/runtime version verification must happen on that machine.

## Future backend modules (not implemented in v0.1.0)

`auth`, `goals`, `routines`, `reviews`, `notes`, `quotes`, `jakk`.

Data migration concerns from frontend: legacy demo IDs are not all UUID; calendar dates (checks/reviews) must remain DATE rather than TIMESTAMPTZ; note image Data URLs should move into file/object storage later; browser-only login is not secure.
