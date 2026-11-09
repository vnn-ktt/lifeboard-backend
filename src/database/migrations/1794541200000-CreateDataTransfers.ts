import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Additive v0.9.0 migration: import receipts and safe preservation of legacy custom quotes. */
export class CreateDataTransfers1794541200000 implements MigrationInterface {
  name = 'CreateDataTransfers1794541200000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "lifeboard_imports" (
      "id" uuid NOT NULL PRIMARY KEY,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "snapshot_hash" char(64) NOT NULL,
      "idempotency_key" varchar(128) NOT NULL,
      "id_map" jsonb NOT NULL,
      "counts" jsonb NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "uq_lifeboard_import_hash" UNIQUE ("user_id", "snapshot_hash"),
      CONSTRAINT "uq_lifeboard_import_key" UNIQUE ("user_id", "idempotency_key"),
      CONSTRAINT "ck_lifeboard_import_hash" CHECK ("snapshot_hash" ~ '^[0-9a-f]{64}$')
    )`);
    await q.query(`CREATE INDEX "ix_lifeboard_imports_user_created" ON "lifeboard_imports" ("user_id", "created_at" DESC)`);
    await q.query(`CREATE TABLE "archived_user_quotes" (
      "id" uuid NOT NULL PRIMARY KEY,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "payload" jsonb NOT NULL,
      CONSTRAINT "ck_archived_user_quote_payload" CHECK (jsonb_typeof("payload") = 'object')
    )`);
    await q.query(`CREATE INDEX "ix_archived_user_quotes_owner" ON "archived_user_quotes" ("user_id")`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE "archived_user_quotes"');
    await q.query('DROP TABLE "lifeboard_imports"');
  }
}
