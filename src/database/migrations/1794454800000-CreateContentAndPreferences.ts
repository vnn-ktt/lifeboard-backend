import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Additive v0.8.0 migration: content, system quotes, profile media and UI preferences. */
export class CreateContentAndPreferences1794454800000 implements MigrationInterface {
  name = 'CreateContentAndPreferences1794454800000';

  async up(q: QueryRunner): Promise<void> {
    // Allow composite FKs to guarantee ownership of referenced files at DB level.
    await q.query(`ALTER TABLE "files" ADD CONSTRAINT "uq_files_id_user" UNIQUE ("id", "user_id")`);
    await q.query(`ALTER TABLE "users" ADD "avatar_file_id" uuid`);
    await q.query(`ALTER TABLE "users" ADD CONSTRAINT "fk_users_avatar_owned" FOREIGN KEY ("avatar_file_id", "id")
      REFERENCES "files"("id", "user_id") ON DELETE SET NULL ("avatar_file_id")`);

    await q.query(`CREATE TABLE "note_groups" (
      "id" uuid NOT NULL PRIMARY KEY,
      "user_id" uuid NOT NULL,
      "goal_id" uuid,
      "name" varchar(90) NOT NULL,
      "color" char(7) NOT NULL DEFAULT '#5b9478',
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "uq_note_groups_id_user" UNIQUE ("id", "user_id"),
      CONSTRAINT "fk_note_groups_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "fk_note_groups_goal_owned" FOREIGN KEY ("goal_id", "user_id")
        REFERENCES "life_goals"("id", "user_id") ON DELETE SET NULL ("goal_id"),
      CONSTRAINT "ck_note_groups_name" CHECK (length(btrim("name")) >= 1),
      CONSTRAINT "ck_note_groups_color" CHECK ("color" ~ '^#[0-9a-fA-F]{6}$')
    )`);
    await q.query(`CREATE INDEX "ix_note_groups_user_created" ON "note_groups" ("user_id","created_at","id")`);
    await q.query(`CREATE INDEX "ix_note_groups_goal" ON "note_groups" ("user_id","goal_id")`);

    await q.query(`CREATE TABLE "notes" (
      "id" uuid NOT NULL PRIMARY KEY,
      "user_id" uuid NOT NULL,
      "title" varchar(160) NOT NULL,
      "content" text NOT NULL DEFAULT '',
      "group_id" uuid,
      "goal_id" uuid,
      "image_file_id" uuid,
      "pinned" boolean NOT NULL DEFAULT false,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "fk_notes_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "fk_notes_group_owned" FOREIGN KEY ("group_id","user_id")
        REFERENCES "note_groups"("id","user_id") ON DELETE SET NULL ("group_id"),
      CONSTRAINT "fk_notes_goal_owned" FOREIGN KEY ("goal_id","user_id")
        REFERENCES "life_goals"("id","user_id") ON DELETE SET NULL ("goal_id"),
      CONSTRAINT "fk_notes_file_owned" FOREIGN KEY ("image_file_id","user_id")
        REFERENCES "files"("id","user_id") ON DELETE SET NULL ("image_file_id"),
      CONSTRAINT "ck_notes_title" CHECK (length(btrim("title")) >= 1),
      CONSTRAINT "ck_notes_content_length" CHECK (char_length("content") <= 20000)
    )`);
    await q.query(`CREATE INDEX "ix_notes_user_pinned_created" ON "notes" ("user_id","pinned" DESC,"created_at" DESC,"id")`);
    await q.query(`CREATE INDEX "ix_notes_user_group" ON "notes" ("user_id","group_id")`);
    await q.query(`CREATE INDEX "ix_notes_user_goal" ON "notes" ("user_id","goal_id")`);
    await q.query(`CREATE INDEX "ix_notes_user_file" ON "notes" ("user_id","image_file_id")`);

    await q.query(`CREATE TABLE "system_quotes" (
      "id" varchar(64) NOT NULL PRIMARY KEY,
      "text" jsonb NOT NULL,
      "author" jsonb NOT NULL,
      "source_title" jsonb NOT NULL,
      "source_url" varchar(1000) NOT NULL,
      "reference" varchar(40) NOT NULL DEFAULT '',
      "created_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "ck_quotes_text_languages" CHECK ("text" ?& ARRAY['ru','en','de']),
      CONSTRAINT "ck_quotes_author_languages" CHECK ("author" ?& ARRAY['ru','en','de']),
      CONSTRAINT "ck_quotes_title_languages" CHECK ("source_title" ?& ARRAY['ru','en','de'])
    )`);
    await q.query(`INSERT INTO "system_quotes" ("id","text","author","source_title","source_url","reference","created_at") VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) ON CONFLICT ("id") DO NOTHING`, ["quote-1", "{\"ru\": \"Одни вещи зависят от нас, другие — нет.\", \"en\": \"Some things are up to us; others are not.\", \"de\": \"Manches liegt in unserer Macht, anderes nicht.\"}", "{\"ru\": \"Эпиктет\", \"en\": \"Epictetus\", \"de\": \"Epiktet\"}", "{\"ru\": \"Энхиридион\", \"en\": \"Enchiridion\", \"de\": \"Handbüchlein\"}", "https://en.wikisource.org/wiki/The_Encheiridion_of_Epictetus/Encheiridion", "I", "2026-11-01T00:00:00"]);
    await q.query(`INSERT INTO "system_quotes" ("id","text","author","source_title","source_url","reference","created_at") VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) ON CONFLICT ("id") DO NOTHING`, ["quote-2", "{\"ru\": \"Нас тревожат не сами события, а наши суждения о них.\", \"en\": \"What troubles us is not events, but our judgments about them.\", \"de\": \"Nicht Ereignisse beunruhigen uns, sondern unsere Urteile darüber.\"}", "{\"ru\": \"Эпиктет\", \"en\": \"Epictetus\", \"de\": \"Epiktet\"}", "{\"ru\": \"Энхиридион\", \"en\": \"Enchiridion\", \"de\": \"Handbüchlein\"}", "https://en.wikisource.org/wiki/The_Encheiridion_of_Epictetus/Encheiridion", "V", "2026-11-01T00:00:00"]);
    await q.query(`INSERT INTO "system_quotes" ("id","text","author","source_title","source_url","reference","created_at") VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) ON CONFLICT ("id") DO NOTHING`, ["quote-3", "{\"ru\": \"Если хочешь расти, будь готов показаться неопытным.\", \"en\": \"If you wish to grow, be willing to appear inexperienced.\", \"de\": \"Wenn du wachsen willst, sei bereit, unerfahren zu wirken.\"}", "{\"ru\": \"Эпиктет\", \"en\": \"Epictetus\", \"de\": \"Epiktet\"}", "{\"ru\": \"Энхиридион\", \"en\": \"Enchiridion\", \"de\": \"Handbüchlein\"}", "https://en.wikisource.org/wiki/The_Encheiridion_of_Epictetus/Encheiridion", "XIII", "2026-11-01T00:00:00"]);
    await q.query(`INSERT INTO "system_quotes" ("id","text","author","source_title","source_url","reference","created_at") VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) ON CONFLICT ("id") DO NOTHING`, ["quote-4", "{\"ru\": \"Не выбирай роль — достойно исполняй ту, что досталась тебе.\", \"en\": \"Do not choose your part; play the one you are given with grace.\", \"de\": \"Wähle deine Rolle nicht, sondern spiele die dir gegebene mit Würde.\"}", "{\"ru\": \"Эпиктет\", \"en\": \"Epictetus\", \"de\": \"Epiktet\"}", "{\"ru\": \"Энхиридион\", \"en\": \"Enchiridion\", \"de\": \"Handbüchlein\"}", "https://en.wikisource.org/wiki/The_Encheiridion_of_Epictetus/Encheiridion", "XVII", "2026-11-01T00:00:00"]);
    await q.query(`INSERT INTO "system_quotes" ("id","text","author","source_title","source_url","reference","created_at") VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) ON CONFLICT ("id") DO NOTHING`, ["quote-5", "{\"ru\": \"Мы пришли в этот мир, чтобы действовать сообща.\", \"en\": \"We came into this world to work together.\", \"de\": \"Wir sind in diese Welt gekommen, um zusammenzuarbeiten.\"}", "{\"ru\": \"Марк Аврелий\", \"en\": \"Marcus Aurelius\", \"de\": \"Mark Aurel\"}", "{\"ru\": \"Наедине с собой\", \"en\": \"Meditations\", \"de\": \"Selbstbetrachtungen\"}", "https://en.wikisource.org/wiki/The_Meditations_of_the_Emperor_Marcus_Antoninus/Book_2", "II.1", "2026-11-01T00:00:00"]);
    await q.query(`INSERT INTO "system_quotes" ("id","text","author","source_title","source_url","reference","created_at") VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) ON CONFLICT ("id") DO NOTHING`, ["quote-6", "{\"ru\": \"Выполняй то, что перед тобой, внимательно и достойно.\", \"en\": \"Do the work before you with attention and dignity.\", \"de\": \"Tu das, was vor dir liegt, aufmerksam und würdevoll.\"}", "{\"ru\": \"Марк Аврелий\", \"en\": \"Marcus Aurelius\", \"de\": \"Mark Aurel\"}", "{\"ru\": \"Наедине с собой\", \"en\": \"Meditations\", \"de\": \"Selbstbetrachtungen\"}", "https://en.wikisource.org/wiki/The_Meditations_of_the_Emperor_Marcus_Antoninus/Book_2", "II.5", "2026-11-01T00:00:00"]);
    await q.query(`INSERT INTO "system_quotes" ("id","text","author","source_title","source_url","reference","created_at") VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) ON CONFLICT ("id") DO NOTHING`, ["quote-7", "{\"ru\": \"Находи время для тишины и изучения чего-то хорошего.\", \"en\": \"Make quiet time to learn something good.\", \"de\": \"Nimm dir stille Zeit, um etwas Gutes zu lernen.\"}", "{\"ru\": \"Марк Аврелий\", \"en\": \"Marcus Aurelius\", \"de\": \"Mark Aurel\"}", "{\"ru\": \"Наедине с собой\", \"en\": \"Meditations\", \"de\": \"Selbstbetrachtungen\"}", "https://en.wikisource.org/wiki/The_Meditations_of_the_Emperor_Marcus_Antoninus/Book_2", "II.7", "2026-11-01T00:00:00"]);
    await q.query(`INSERT INTO "system_quotes" ("id","text","author","source_title","source_url","reference","created_at") VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) ON CONFLICT ("id") DO NOTHING`, ["quote-8", "{\"ru\": \"Даже малому действию полезно иметь осознанную цель.\", \"en\": \"Even the smallest action ought to serve a conscious purpose.\", \"de\": \"Selbst die kleinste Handlung sollte einem bewussten Ziel dienen.\"}", "{\"ru\": \"Марк Аврелий\", \"en\": \"Marcus Aurelius\", \"de\": \"Mark Aurel\"}", "{\"ru\": \"Наедине с собой\", \"en\": \"Meditations\", \"de\": \"Selbstbetrachtungen\"}", "https://en.wikisource.org/wiki/The_Meditations_of_the_Emperor_Marcus_Antoninus/Book_2", "II.16", "2026-11-01T00:00:00"]);
    await q.query(`INSERT INTO "system_quotes" ("id","text","author","source_title","source_url","reference","created_at") VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) ON CONFLICT ("id") DO NOTHING`, ["quote-9", "{\"ru\": \"От тревожной мысли можно отступить и вновь обрести покой.\", \"en\": \"You can let go of a troubling thought and return to calm.\", \"de\": \"Du kannst einen belastenden Gedanken loslassen und zur Ruhe zurückfinden.\"}", "{\"ru\": \"Марк Аврелий\", \"en\": \"Marcus Aurelius\", \"de\": \"Mark Aurel\"}", "{\"ru\": \"Наедине с собой\", \"en\": \"Meditations\", \"de\": \"Selbstbetrachtungen\"}", "https://en.wikisource.org/wiki/The_Meditations_of_the_Emperor_Marcus_Antoninus/Book_5", "V.2", "2026-11-01T00:00:00"]);
    await q.query(`INSERT INTO "system_quotes" ("id","text","author","source_title","source_url","reference","created_at") VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) ON CONFLICT ("id") DO NOTHING`, ["quote-10", "{\"ru\": \"Пока мы откладываем дела, жизнь идёт вперёд.\", \"en\": \"While we postpone, life keeps moving.\", \"de\": \"Während wir aufschieben, geht das Leben weiter.\"}", "{\"ru\": \"Сенека\", \"en\": \"Seneca\", \"de\": \"Seneca\"}", "{\"ru\": \"Нравственные письма к Луцилию\", \"en\": \"Moral Letters to Lucilius\", \"de\": \"Briefe an Lucilius\"}", "https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_1", "I.2", "2026-11-01T00:00:00"]);
    await q.query(`INSERT INTO "system_quotes" ("id","text","author","source_title","source_url","reference","created_at") VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) ON CONFLICT ("id") DO NOTHING`, ["quote-11", "{\"ru\": \"Чаще нас мучает воображаемое, а не реальное.\", \"en\": \"We suffer more often in imagination than in reality.\", \"de\": \"Häufig leiden wir mehr in der Vorstellung als in Wirklichkeit.\"}", "{\"ru\": \"Сенека\", \"en\": \"Seneca\", \"de\": \"Seneca\"}", "{\"ru\": \"Нравственные письма к Луцилию\", \"en\": \"Moral Letters to Lucilius\", \"de\": \"Briefe an Lucilius\"}", "https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_13", "XIII.4", "2026-11-01T00:00:00"]);

    await q.query(`CREATE TABLE "quote_assignments" (
      "user_id" uuid NOT NULL,
      "placement" varchar(12) NOT NULL,
      "quote_id" varchar(64),
      CONSTRAINT "pk_quote_assignments" PRIMARY KEY ("user_id","placement"),
      CONSTRAINT "fk_quote_assignments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "fk_quote_assignments_quote" FOREIGN KEY ("quote_id") REFERENCES "system_quotes"("id") ON DELETE SET NULL,
      CONSTRAINT "ck_quote_assignments_placement" CHECK ("placement" IN ('dashboard','review'))
    )`);

    await q.query(`CREATE TABLE "user_preferences" (
      "user_id" uuid NOT NULL PRIMARY KEY,
      "theme" varchar(10) NOT NULL DEFAULT 'default',
      "language" varchar(2) NOT NULL DEFAULT 'ru',
      "goal_entry_mode" varchar(8) NOT NULL DEFAULT 'wizard',
      "show_helper" boolean NOT NULL DEFAULT true,
      "show_avatar" boolean NOT NULL DEFAULT true,
      "mask_stats" boolean NOT NULL DEFAULT false,
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "fk_preferences_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
      CONSTRAINT "ck_preferences_theme" CHECK ("theme" IN ('default','dark','orange')),
      CONSTRAINT "ck_preferences_language" CHECK ("language" IN ('ru','en','de')),
      CONSTRAINT "ck_preferences_entry_mode" CHECK ("goal_entry_mode" IN ('wizard','quick'))
    )`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "user_preferences"`);
    await q.query(`DROP TABLE "quote_assignments"`);
    await q.query(`DROP TABLE "system_quotes"`);
    await q.query(`DROP TABLE "notes"`);
    await q.query(`DROP TABLE "note_groups"`);
    await q.query(`ALTER TABLE "users" DROP CONSTRAINT "fk_users_avatar_owned"`);
    await q.query(`ALTER TABLE "users" DROP COLUMN "avatar_file_id"`);
    await q.query(`ALTER TABLE "files" DROP CONSTRAINT "uq_files_id_user"`);
  }
}
