import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Lifeboard v0.4: routine plans and date-only completion flags. */
export class CreateRoutinesAndChecks1793936400000 implements MigrationInterface {
  name = 'CreateRoutinesAndChecks1793936400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "life_routines" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "goal_id" uuid NOT NULL,
        "title" varchar(160) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "time" varchar(5) NOT NULL,
        "days" smallint[] NOT NULL,
        "duration_minutes" smallint NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_life_routines" PRIMARY KEY ("id"),
        CONSTRAINT "uq_life_routines_id_user" UNIQUE ("id", "user_id"),
        CONSTRAINT "fk_life_routines_goal_same_user"
          FOREIGN KEY ("goal_id", "user_id") REFERENCES "life_goals"("id", "user_id") ON DELETE CASCADE,
        CONSTRAINT "ck_life_routines_title" CHECK (length(btrim("title")) >= 1),
        CONSTRAINT "ck_life_routines_time" CHECK ("time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
        CONSTRAINT "ck_life_routines_days" CHECK (
          cardinality("days") BETWEEN 1 AND 7
          AND "days" <@ ARRAY[1,2,3,4,5,6,7]::smallint[]
        ),
        CONSTRAINT "ck_life_routines_duration" CHECK ("duration_minutes" BETWEEN 1 AND 1440)
      )
    `);
    await queryRunner.query('CREATE INDEX "ix_life_routines_user_time" ON "life_routines" ("user_id", "time")');
    await queryRunner.query('CREATE INDEX "ix_life_routines_goal" ON "life_routines" ("goal_id")');

    await queryRunner.query(`
      CREATE TABLE "routine_checks" (
        "routine_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "date" date NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_routine_checks" PRIMARY KEY ("routine_id", "date"),
        CONSTRAINT "fk_routine_checks_routine_same_user"
          FOREIGN KEY ("routine_id", "user_id") REFERENCES "life_routines"("id", "user_id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query('CREATE INDEX "ix_routine_checks_user_date" ON "routine_checks" ("user_id", "date")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "routine_checks"');
    await queryRunner.query('DROP TABLE "life_routines"');
  }
}
