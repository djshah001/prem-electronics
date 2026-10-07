ALTER TABLE "payment_attempts" ADD COLUMN IF NOT EXISTS "captured_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "payment_attempts"
SET "captured_at" = COALESCE("finalized_at", "updated_at")
WHERE "status" IN ('captured', 'refunded') AND "captured_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "category_id_snapshot" uuid;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "category_name_snapshot" varchar(100);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "category_snapshot_source" varchar(20) DEFAULT 'historical';
--> statement-breakpoint
UPDATE "order_items" oi
SET "category_id_snapshot" = p."category_id",
    "category_name_snapshot" = c."name",
    "category_snapshot_source" = 'current_fallback'
FROM "products" p
LEFT JOIN "categories" c ON c."id" = p."category_id"
WHERE oi."product_id" = p."id" AND oi."category_id_snapshot" IS NULL;
--> statement-breakpoint
UPDATE "order_items"
SET "category_name_snapshot" = COALESCE("category_name_snapshot", 'Unknown / legacy'),
    "category_snapshot_source" = COALESCE("category_snapshot_source", 'unknown')
WHERE "category_name_snapshot" IS NULL OR "category_snapshot_source" IS NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "category_snapshot_source" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."payment_refund_status" AS ENUM('pending', 'processed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_refunds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE restrict,
  "payment_attempt_id" uuid NOT NULL REFERENCES "payment_attempts"("id") ON DELETE restrict,
  "provider_refund_id" varchar(100) UNIQUE,
  "amount_minor" integer NOT NULL CHECK ("amount_minor" > 0),
  "merchandise_minor" integer,
  "tax_minor" integer,
  "shipping_minor" integer,
  "currency" varchar(3) DEFAULT 'INR' NOT NULL,
  "status" "payment_refund_status" DEFAULT 'pending' NOT NULL,
  "failure_reason" varchar(500),
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "payment_refunds_allocations_check" CHECK (
    ("merchandise_minor" IS NULL AND "tax_minor" IS NULL AND "shipping_minor" IS NULL)
    OR COALESCE("merchandise_minor", 0) + COALESCE("tax_minor", 0) + COALESCE("shipping_minor", 0) = "amount_minor"
  )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_refunds_order_id_idx" ON "payment_refunds" ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_refunds_attempt_id_idx" ON "payment_refunds" ("payment_attempt_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_refunds_status_processed_at_idx" ON "payment_refunds" ("status", "processed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_attempts_status_captured_at_idx" ON "payment_attempts" ("status", "captured_at");
