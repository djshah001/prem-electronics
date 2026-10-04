ALTER TABLE "auth_sessions" ADD COLUMN IF NOT EXISTS "family_id" uuid;
--> statement-breakpoint
UPDATE "auth_sessions" SET "family_id" = "id" WHERE "family_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "auth_sessions" ALTER COLUMN "family_id" SET DEFAULT gen_random_uuid();
--> statement-breakpoint
ALTER TABLE "auth_sessions" ALTER COLUMN "family_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_family_id_idx" ON "auth_sessions" ("family_id");
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."blog_status" AS ENUM('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "excerpt" varchar(500);
--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "cover_alt" varchar(255);
--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "status" "blog_status";
--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1;
--> statement-breakpoint
UPDATE "blogs"
SET "status" = CASE WHEN "is_active" THEN 'published'::"blog_status" ELSE 'archived'::"blog_status" END,
    "published_at" = CASE WHEN "is_active" THEN COALESCE("published_at", "created_at") ELSE "published_at" END,
    "archived_at" = CASE WHEN NOT "is_active" THEN COALESCE("archived_at", "updated_at") ELSE "archived_at" END,
    "version" = COALESCE("version", 1)
WHERE "status" IS NULL OR "version" IS NULL;
--> statement-breakpoint
ALTER TABLE "blogs" ALTER COLUMN "status" SET DEFAULT 'draft';
--> statement-breakpoint
ALTER TABLE "blogs" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "blogs" ALTER COLUMN "version" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blogs_status_published_at_idx" ON "blogs" ("status", "published_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blogs_updated_at_idx" ON "blogs" ("updated_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_content_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "blog_id" uuid NOT NULL REFERENCES "blogs"("id") ON DELETE cascade,
  "content" text NOT NULL,
  "version" integer NOT NULL,
  "reason" varchar(50) DEFAULT 'edit' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_content_revisions_blog_id_idx" ON "blog_content_revisions" ("blog_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_slug_redirects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "blog_id" uuid NOT NULL REFERENCES "blogs"("id") ON DELETE cascade,
  "old_slug" varchar(300) NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_slug_redirects_blog_id_idx" ON "blog_slug_redirects" ("blog_id");
