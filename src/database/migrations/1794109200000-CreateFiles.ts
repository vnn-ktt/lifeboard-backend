import type { MigrationInterface, QueryRunner } from 'typeorm';

/** v0.6: user-owned metadata only; binary objects live in private S3 buckets. */
export class CreateFiles1794109200000 implements MigrationInterface {
  name = 'CreateFiles1794109200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "files" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "storage_key" varchar(255) NOT NULL,
        "original_name" varchar(180) NOT NULL,
        "mime_type" varchar(20) NOT NULL,
        "size" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "pk_files" PRIMARY KEY ("id"),
        CONSTRAINT "uq_files_storage_key" UNIQUE ("storage_key"),
        CONSTRAINT "fk_files_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_files_size" CHECK ("size" > 0 AND "size" <= 5242880),
        CONSTRAINT "ck_files_mime" CHECK ("mime_type" IN ('image/jpeg', 'image/png', 'image/webp'))
      )
    `);
    await queryRunner.query('CREATE INDEX "ix_files_user_created" ON "files" ("user_id", "created_at")');
    await queryRunner.query('CREATE INDEX "ix_files_pending_deletion" ON "files" ("deleted_at") WHERE "deleted_at" IS NOT NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "files"');
  }
}
