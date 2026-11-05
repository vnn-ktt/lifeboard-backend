import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Lifeboard v0.5: independent, user-scoped Monday reflections. */
export class CreateWeeklyReviews1794022800000 implements MigrationInterface {
  name = 'CreateWeeklyReviews1794022800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "weekly_reviews" (
        "user_id" uuid NOT NULL,
        "week_start" date NOT NULL,
        "wins" varchar(1000) NOT NULL DEFAULT '',
        "obstacles" varchar(1000) NOT NULL DEFAULT '',
        "next_step" varchar(1000) NOT NULL DEFAULT '',
        "mood" smallint NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_weekly_reviews" PRIMARY KEY ("user_id", "week_start"),
        CONSTRAINT "fk_weekly_reviews_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_weekly_reviews_monday" CHECK (EXTRACT(ISODOW FROM "week_start") = 1),
        CONSTRAINT "ck_weekly_reviews_mood" CHECK ("mood" BETWEEN 1 AND 10)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "weekly_reviews"');
  }
}
