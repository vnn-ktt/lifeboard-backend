import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Additive migration. Existing goals remain 'activity' with their routine target unchanged. */
export class CreateGoalMetricsAndCheckins1794282000000 implements MigrationInterface {
  name = 'CreateGoalMetricsAndCheckins1794282000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" ADD "timezone" varchar(64) NOT NULL DEFAULT 'UTC'`);
    await q.query(`ALTER TABLE "life_goals"
      ADD "measurement" jsonb NOT NULL DEFAULT '{"type":"activity"}'::jsonb,
      ADD "start_date" date,
      ADD "due_date" date,
      ADD "checkin_frequency" varchar(8),
      ADD "checkin_weekday" smallint,
      ADD "checkin_from_date" date`);
    await q.query(`ALTER TABLE "life_goals" ADD CONSTRAINT "ck_goals_dates" CHECK
      ("start_date" IS NULL OR "due_date" IS NULL OR "start_date" <= "due_date")`);
    await q.query(`ALTER TABLE "life_goals" ADD CONSTRAINT "ck_goals_measurement_type" CHECK
      (jsonb_typeof("measurement") = 'object' AND COALESCE("measurement"->>'type', '') IN ('activity','numeric','binary'))`);
    // Safe for servers upgraded from an earlier Goal Metrics prototype that already populated measurement.
    await q.query(`UPDATE "life_goals" g SET
      "checkin_frequency" = 'weekly', "checkin_weekday" = 7,
      "checkin_from_date" = (now() AT TIME ZONE COALESCE(u."timezone", 'UTC'))::date
      FROM "users" u WHERE u."id" = g."user_id"
        AND g."measurement"->>'type' IN ('numeric','binary') AND g."checkin_frequency" IS NULL`);
    await q.query(`ALTER TABLE "life_goals" ADD CONSTRAINT "ck_goals_checkin_schedule" CHECK (
      ("measurement"->>'type' = 'activity' AND "checkin_frequency" IS NULL AND "checkin_weekday" IS NULL AND "checkin_from_date" IS NULL)
      OR
      ("measurement"->>'type' IN ('numeric','binary') AND "checkin_frequency" IN ('off','manual','daily','weekly')
        AND "checkin_frequency" IS NOT NULL AND "checkin_from_date" IS NOT NULL
        AND (("checkin_frequency" = 'weekly' AND "checkin_weekday" BETWEEN 1 AND 7)
          OR ("checkin_frequency" <> 'weekly' AND "checkin_weekday" IS NULL)))
    )`);
    await q.query(`CREATE TABLE "goal_metric_entries" (
      "id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
      "goal_id" uuid NOT NULL,
      "date" date NOT NULL,
      "value" double precision NOT NULL,
      "note" varchar(300),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "pk_goal_metric_entries" PRIMARY KEY ("id"),
      CONSTRAINT "uq_goal_metric_id_goal_user" UNIQUE ("id", "goal_id", "user_id"),
      CONSTRAINT "fk_metric_goal_owner" FOREIGN KEY ("goal_id", "user_id")
        REFERENCES "life_goals"("id", "user_id") ON DELETE CASCADE,
      CONSTRAINT "ck_metric_value_finite" CHECK ("value" > '-Infinity'::float8 AND "value" < 'Infinity'::float8),
      CONSTRAINT "ck_metric_value_range" CHECK ("value" BETWEEN -1000000000000 AND 1000000000000)
    )`);
    await q.query(`CREATE INDEX "ix_goal_metric_user_goal_date" ON "goal_metric_entries"
      ("user_id", "goal_id", "date" DESC, "created_at" DESC)`);
    await q.query(`CREATE TABLE "goal_checkins" (
      "id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
      "goal_id" uuid NOT NULL,
      "due_date" date NOT NULL,
      "completed_at" timestamptz NOT NULL DEFAULT now(),
      "status" varchar(12) NOT NULL,
      "metric_entry_id" uuid,
      CONSTRAINT "pk_goal_checkins" PRIMARY KEY ("id"),
      CONSTRAINT "uq_goal_checkin_goal_date" UNIQUE ("goal_id", "due_date"),
      CONSTRAINT "ck_goal_checkin_status" CHECK ("status" IN ('updated','unchanged','skipped')),
      CONSTRAINT "fk_goal_checkin_goal_owner" FOREIGN KEY ("goal_id", "user_id")
        REFERENCES "life_goals"("id", "user_id") ON DELETE CASCADE,
      CONSTRAINT "fk_goal_checkin_metric" FOREIGN KEY ("metric_entry_id", "goal_id", "user_id")
        REFERENCES "goal_metric_entries"("id", "goal_id", "user_id")
        ON DELETE SET NULL ("metric_entry_id")
    )`);
    await q.query(`CREATE INDEX "ix_goal_checkins_user_goal_date" ON "goal_checkins"
      ("user_id", "goal_id", "due_date" DESC)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "goal_checkins"`);
    await q.query(`DROP TABLE "goal_metric_entries"`);
    await q.query(`ALTER TABLE "life_goals" DROP CONSTRAINT "ck_goals_checkin_schedule"`);
    await q.query(`ALTER TABLE "life_goals" DROP CONSTRAINT "ck_goals_measurement_type"`);
    await q.query(`ALTER TABLE "life_goals" DROP CONSTRAINT "ck_goals_dates"`);
    await q.query(`ALTER TABLE "life_goals"
      DROP COLUMN "checkin_from_date", DROP COLUMN "checkin_weekday", DROP COLUMN "checkin_frequency",
      DROP COLUMN "due_date", DROP COLUMN "start_date", DROP COLUMN "measurement"`);
    await q.query(`ALTER TABLE "users" DROP COLUMN "timezone"`);
  }
}
