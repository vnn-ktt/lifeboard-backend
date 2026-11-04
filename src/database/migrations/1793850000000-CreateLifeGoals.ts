import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Schema and built-in life areas matching frontend src/modules/lifeboard/data/seed.ts. */
export class CreateLifeGoals1793850000000 implements MigrationInterface {
  name = 'CreateLifeGoals1793850000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "life_areas" (
        "id" varchar(64) NOT NULL,
        "user_id" uuid,
        "name" varchar(35) NOT NULL,
        "icon" varchar(60) NOT NULL,
        "accent" char(7) NOT NULL,
        "subtle" char(7) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_life_areas" PRIMARY KEY ("id"),
        CONSTRAINT "fk_life_areas_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_life_areas_name" CHECK (length(btrim("name")) >= 2)
      )
    `);
    await queryRunner.query('CREATE INDEX "ix_life_areas_user_id" ON "life_areas" ("user_id")');
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_life_areas_user_name"
      ON "life_areas" ("user_id", lower("name"))
      WHERE "user_id" IS NOT NULL
    `);

    // System areas have stable, non-UUID IDs so existing frontend categories keep working.
    await queryRunner.query(`
      INSERT INTO "life_areas" ("id", "user_id", "name", "icon", "accent", "subtle") VALUES
        ('dogs',          NULL, 'Собаки',       'bi-heart-pulse', '#cf8b54', '#f8ebdc'),
        ('career',        NULL, 'Развитие',     'bi-code-slash',   '#6979d1', '#e9ecfb'),
        ('leadership',    NULL, 'Лидерство',   'bi-people',       '#438d78', '#e0f2ea'),
        ('health',        NULL, 'Здоровье',    'bi-activity',     '#cf7779', '#fbe9ea'),
        ('finance',       NULL, 'Финансы',     'bi-wallet2',      '#b2904d', '#faf2dc'),
        ('relationships', NULL, 'Отношения',   'bi-chat-heart',   '#bc739a', '#f8eaf3'),
        ('learning',      NULL, 'Языки',       'bi-translate',    '#6082ad', '#e5effb'),
        ('other',         NULL, 'Другое',      'bi-compass',      '#718096', '#edf0f5')
    `);

    await queryRunner.query(`
      CREATE TABLE "life_goals" (
        "id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "area_id" varchar(64) NOT NULL,
        "title" varchar(160) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "horizon" varchar(12) NOT NULL,
        "target" integer NOT NULL,
        "parent_id" uuid,
        "focus_position" smallint,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_life_goals" PRIMARY KEY ("id"),
        CONSTRAINT "uq_life_goals_id_user" UNIQUE ("id", "user_id"),
        CONSTRAINT "fk_life_goals_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_life_goals_area" FOREIGN KEY ("area_id") REFERENCES "life_areas"("id") ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED,
        CONSTRAINT "ck_life_goals_horizon" CHECK ("horizon" IN ('month','quarter','year','five-years')),
        CONSTRAINT "ck_life_goals_target" CHECK ("target" BETWEEN 1 AND 1000000),
        CONSTRAINT "ck_life_goals_title" CHECK (length(btrim("title")) >= 1),
        CONSTRAINT "ck_life_goals_parent_not_self" CHECK ("parent_id" IS NULL OR "parent_id" <> "id"),
        CONSTRAINT "ck_life_goals_focus_position" CHECK ("focus_position" IS NULL OR "focus_position" BETWEEN 0 AND 2)
      )
    `);
    // Protect user ownership at DB level: a child cannot point to a parent belonging to another user.
    // PostgreSQL 17 supports SET NULL of only parent_id, preserving the non-null user_id.
    await queryRunner.query(`
      ALTER TABLE "life_goals"
      ADD CONSTRAINT "fk_life_goals_parent_same_user"
      FOREIGN KEY ("parent_id", "user_id")
      REFERENCES "life_goals"("id", "user_id")
      ON DELETE SET NULL ("parent_id")
    `);
    await queryRunner.query('CREATE INDEX "ix_life_goals_user_created" ON "life_goals" ("user_id", "created_at")');
    await queryRunner.query('CREATE INDEX "ix_life_goals_parent" ON "life_goals" ("parent_id")');
    await queryRunner.query('CREATE INDEX "ix_life_goals_area" ON "life_goals" ("area_id")');
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_life_goals_focus_position"
      ON "life_goals" ("user_id", "focus_position")
      WHERE "focus_position" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "user_life_settings" (
        "user_id" uuid NOT NULL,
        "vision" text NOT NULL DEFAULT '',
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_life_settings" PRIMARY KEY ("user_id"),
        CONSTRAINT "fk_user_life_settings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "user_life_settings"');
    await queryRunner.query('DROP TABLE "life_goals"');
    await queryRunner.query('DROP TABLE "life_areas"');
  }
}
