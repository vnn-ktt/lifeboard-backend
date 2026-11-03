import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndSessions1793763600000 implements MigrationInterface {
  name = 'CreateUsersAndSessions1793763600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL,
        "email" varchar(254) NOT NULL,
        "name" varchar(60) NOT NULL,
        "nickname" varchar(24),
        "about" varchar(400) NOT NULL DEFAULT '',
        "password_hash" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_users" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX "uq_users_email_lower" ON "users" (lower("email"))');
    await queryRunner.query(`
      CREATE TABLE "user_sessions" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "token_hash" char(64) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        CONSTRAINT "pk_user_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX "uq_sessions_token_hash" ON "user_sessions" ("token_hash")');
    await queryRunner.query('CREATE INDEX "ix_sessions_user_id" ON "user_sessions" ("user_id")');
    await queryRunner.query('CREATE INDEX "ix_sessions_expires_at" ON "user_sessions" ("expires_at")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "user_sessions"');
    await queryRunner.query('DROP TABLE "users"');
  }
}
