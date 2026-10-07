-- Add variant_id to cart_items
ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "variant_id" uuid;
--> statement-breakpoint
-- Backfill cart_items with default variants of products
UPDATE "cart_items" ci
SET "variant_id" = pv.id
FROM "product_variants" pv
WHERE pv.product_id = ci.product_id
  AND (ci.variant_id IS NULL);
--> statement-breakpoint
-- Drop old product-level unique constraint on cart_items and create variant-level unique index
DROP INDEX IF EXISTS "cart_items_cart_product_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_cart_variant_unique" ON "cart_items" USING btree ("cart_id", "variant_id");
--> statement-breakpoint
-- Add foreign key constraint for variant_id on cart_items
DO $$ BEGIN
  ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Add variant_id to order_items
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variant_id" uuid;
--> statement-breakpoint
-- Backfill order_items with default variants of products
UPDATE "order_items" oi
SET "variant_id" = pv.id
FROM "product_variants" pv
WHERE pv.product_id = oi.product_id
  AND (oi.variant_id IS NULL);
--> statement-breakpoint
-- Add foreign key constraint for variant_id on order_items
DO $$ BEGIN
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
