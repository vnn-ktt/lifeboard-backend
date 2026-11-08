import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Additive: existing goals gain 'active' status; no historical status events are invented. */
export class CreateGoalExecution1794368400000 implements MigrationInterface {
  name = 'CreateGoalExecution1794368400000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "life_goals"
      ADD COLUMN "status" varchar(12) NOT NULL DEFAULT 'active',
      ADD COLUMN "completed_at" timestamptz`);
    await q.query(`ALTER TABLE "life_goals" ADD CONSTRAINT "ck_life_goal_status"
      CHECK ("status" IN ('active','paused','completed','cancelled'))`);
    await q.query(`ALTER TABLE "life_goals" ADD CONSTRAINT "ck_life_goal_completed_at"
      CHECK (("status" = 'completed') = ("completed_at" IS NOT NULL))`);
    await q.query(`CREATE INDEX "ix_life_goals_user_status" ON "life_goals" ("user_id", "status")`);

    await q.query(`CREATE TABLE "goal_milestones" (
      "id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
      "goal_id" uuid NOT NULL,
      "title" varchar(90) NOT NULL,
      "description" varchar(500) NOT NULL DEFAULT '',
      "order" integer NOT NULL DEFAULT 0,
      "due_date" date,
      "completed_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "pk_goal_milestones" PRIMARY KEY ("id"),
      CONSTRAINT "uq_goal_milestones_identity" UNIQUE ("id", "goal_id", "user_id"),
      CONSTRAINT "fk_goal_milestones_owner" FOREIGN KEY ("goal_id", "user_id")
        REFERENCES "life_goals" ("id", "user_id") ON DELETE CASCADE,
      CONSTRAINT "ck_goal_milestones_title" CHECK (length(btrim("title")) BETWEEN 2 AND 90),
      CONSTRAINT "ck_goal_milestones_order" CHECK ("order" BETWEEN 0 AND 10000)
    )`);
    await q.query(`CREATE INDEX "ix_goal_milestones_user_goal_order"
      ON "goal_milestones" ("user_id", "goal_id", "order", "created_at", "id")`);
    await q.query(`CREATE INDEX "ix_goal_milestones_goal_due"
      ON "goal_milestones" ("goal_id", "due_date")`);

    await q.query(`CREATE TABLE "goal_tasks" (
      "id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
      "goal_id" uuid NOT NULL,
      "milestone_id" uuid,
      "title" varchar(90) NOT NULL,
      "description" varchar(500) NOT NULL DEFAULT '',
      "due_date" date,
      "completed_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "pk_goal_tasks" PRIMARY KEY ("id"),
      CONSTRAINT "fk_goal_tasks_owner" FOREIGN KEY ("goal_id", "user_id")
        REFERENCES "life_goals" ("id", "user_id") ON DELETE CASCADE,
      CONSTRAINT "fk_goal_tasks_milestone_owner"
        FOREIGN KEY ("milestone_id", "goal_id", "user_id")
        REFERENCES "goal_milestones" ("id", "goal_id", "user_id")
        ON DELETE SET NULL ("milestone_id"),
      CONSTRAINT "ck_goal_tasks_title" CHECK (length(btrim("title")) BETWEEN 2 AND 90)
    )`);
    await q.query(`CREATE INDEX "ix_goal_tasks_user_goal_due" ON "goal_tasks"
      ("user_id", "goal_id", "due_date", "created_at")`);
    await q.query(`CREATE INDEX "ix_goal_tasks_user_open_due" ON "goal_tasks"
      ("user_id", "due_date", "created_at") WHERE "completed_at" IS NULL`);
    await q.query(`CREATE INDEX "ix_goal_tasks_milestone" ON "goal_tasks" ("milestone_id")`);

    await q.query(`CREATE TABLE "goal_status_events" (
      "id" uuid NOT NULL,
      "user_id" uuid NOT NULL,
      "goal_id" uuid NOT NULL,
      "status" varchar(12) NOT NULL,
      "changed_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "pk_goal_status_events" PRIMARY KEY ("id"),
      CONSTRAINT "fk_goal_status_events_owner" FOREIGN KEY ("goal_id", "user_id")
        REFERENCES "life_goals" ("id", "user_id") ON DELETE CASCADE,
      CONSTRAINT "ck_goal_status_event_status"
        CHECK ("status" IN ('active','paused','completed','cancelled'))
    )`);
    await q.query(`CREATE INDEX "ix_goal_status_events_goal_changed"
      ON "goal_status_events" ("goal_id", "changed_at" DESC, "id" DESC)`);
    await q.query(`CREATE INDEX "ix_goal_status_events_user_goal"
      ON "goal_status_events" ("user_id", "goal_id")`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE "goal_status_events"');
    await q.query('DROP TABLE "goal_tasks"');
    await q.query('DROP TABLE "goal_milestones"');
    await q.query('DROP INDEX "ix_life_goals_user_status"');
    await q.query('ALTER TABLE "life_goals" DROP CONSTRAINT "ck_life_goal_completed_at"');
    await q.query('ALTER TABLE "life_goals" DROP CONSTRAINT "ck_life_goal_status"');
    await q.query('ALTER TABLE "life_goals" DROP COLUMN "completed_at", DROP COLUMN "status"');
  }
}
