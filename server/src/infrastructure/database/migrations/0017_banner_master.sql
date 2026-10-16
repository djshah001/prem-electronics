DO $$ BEGIN CREATE TYPE "asset_status" AS ENUM ('ready', 'quarantined'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "banner_placement" AS ENUM ('home_hero'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "banner_content_mode" AS ENUM ('artwork', 'overlay'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "banner_text_alignment" AS ENUM ('left', 'center', 'right'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "banner_content_position" AS ENUM ('top_left', 'top_center', 'top_right', 'center_left', 'center', 'center_right', 'bottom_left', 'bottom_center', 'bottom_right'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "banner_text_theme" AS ENUM ('light', 'dark'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "media_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "kind" varchar(40) NOT NULL DEFAULT 'banner',
  "status" "asset_status" NOT NULL DEFAULT 'ready',
  "storage_key" varchar(500) NOT NULL UNIQUE,
  "url" varchar(1000) NOT NULL,
  "mime_type" varchar(80) NOT NULL,
  "width" integer NOT NULL,
  "height" integer NOT NULL,
  "byte_size" integer NOT NULL,
  "uploaded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "media_assets_dimensions_check" CHECK ("width" > 0 AND "height" > 0 AND "byte_size" > 0)
);
CREATE INDEX IF NOT EXISTS "media_assets_kind_status_idx" ON "media_assets" ("kind", "status", "created_at");

CREATE TABLE IF NOT EXISTS "banners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "internal_name" varchar(120) NOT NULL,
  "placement" "banner_placement" NOT NULL DEFAULT 'home_hero',
  "content_mode" "banner_content_mode" NOT NULL,
  "desktop_asset_id" uuid NOT NULL REFERENCES "media_assets"("id") ON DELETE RESTRICT,
  "mobile_asset_id" uuid REFERENCES "media_assets"("id") ON DELETE RESTRICT,
  "desktop_alt_text" varchar(240) NOT NULL DEFAULT '',
  "mobile_alt_text" varchar(240),
  "accessible_link_label" varchar(160),
  "eyebrow" varchar(80), "headline" varchar(160), "description" varchar(400),
  "primary_cta_label" varchar(80), "primary_cta_url" varchar(1000), "banner_link_url" varchar(1000),
  "open_in_new_tab" boolean NOT NULL DEFAULT false,
  "text_alignment" "banner_text_alignment" NOT NULL DEFAULT 'left',
  "desktop_content_position" "banner_content_position" NOT NULL DEFAULT 'center_left',
  "mobile_content_position" "banner_content_position" NOT NULL DEFAULT 'bottom_left',
  "text_theme" "banner_text_theme" NOT NULL DEFAULT 'light',
  "overlay_strength" integer NOT NULL DEFAULT 45,
  "desktop_focal_x" integer NOT NULL DEFAULT 50, "desktop_focal_y" integer NOT NULL DEFAULT 50,
  "mobile_focal_x" integer NOT NULL DEFAULT 50, "mobile_focal_y" integer NOT NULL DEFAULT 50,
  "sort_order" integer NOT NULL DEFAULT 0, "is_active" boolean NOT NULL DEFAULT false,
  "starts_at" timestamptz, "ends_at" timestamptz, "archived_at" timestamptz,
  "version" integer NOT NULL DEFAULT 1,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "banners_overlay_strength_check" CHECK ("overlay_strength" BETWEEN 0 AND 80),
  CONSTRAINT "banners_focal_points_check" CHECK ("desktop_focal_x" BETWEEN 0 AND 100 AND "desktop_focal_y" BETWEEN 0 AND 100 AND "mobile_focal_x" BETWEEN 0 AND 100 AND "mobile_focal_y" BETWEEN 0 AND 100),
  CONSTRAINT "banners_schedule_check" CHECK ("starts_at" IS NULL OR "ends_at" IS NULL OR "ends_at" > "starts_at"),
  CONSTRAINT "banners_version_check" CHECK ("version" > 0)
);
CREATE INDEX IF NOT EXISTS "banners_public_visibility_idx" ON "banners" ("placement", "is_active", "archived_at", "sort_order");
CREATE INDEX IF NOT EXISTS "banners_schedule_idx" ON "banners" ("placement", "starts_at", "ends_at");
CREATE INDEX IF NOT EXISTS "banners_updated_idx" ON "banners" ("updated_at", "id");

CREATE TABLE IF NOT EXISTS "banner_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "placement" "banner_placement" NOT NULL DEFAULT 'home_hero',
  "autoplay_enabled" boolean NOT NULL DEFAULT true,
  "autoplay_interval_ms" integer NOT NULL DEFAULT 6000,
  "show_navigation" boolean NOT NULL DEFAULT true,
  "show_indicators" boolean NOT NULL DEFAULT true,
  "version" integer NOT NULL DEFAULT 1,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "banner_settings_interval_check" CHECK ("autoplay_interval_ms" BETWEEN 3000 AND 15000),
  CONSTRAINT "banner_settings_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "banner_settings_placement_uidx" ON "banner_settings" ("placement");
INSERT INTO "banner_settings" ("placement") VALUES ('home_hero') ON CONFLICT ("placement") DO NOTHING;
