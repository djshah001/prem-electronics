CREATE TABLE IF NOT EXISTS "product_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action,
	"name" varchar(100) NOT NULL,
	"normalized_key" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_option_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action,
	"label" varchar(100) NOT NULL,
	"normalized_value" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"color_swatch" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action,
	"sku" varchar(100) NOT NULL UNIQUE,
	"barcode" varchar(100),
	"price" numeric(10, 2) NOT NULL,
	"sale_price" numeric(10, 2),
	"price_minor" integer NOT NULL,
	"sale_price_minor" integer,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"option_combination_key" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "variant_option_values" (
	"variant_id" uuid NOT NULL REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action,
	"option_id" uuid NOT NULL REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action,
	"option_value_id" uuid NOT NULL REFERENCES "public"."product_option_values"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "variant_option_values_pkey" PRIMARY KEY("variant_id","option_value_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_options_product_key_idx" ON "product_options" USING btree ("product_id", "normalized_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_option_values_option_val_idx" ON "product_option_values" USING btree ("option_id", "normalized_value");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_prod_comb_idx" ON "product_variants" USING btree ("product_id", "option_combination_key");
--> statement-breakpoint
-- Backfill each existing product into a default variant so every purchase has a variant
INSERT INTO "product_variants" (
	"product_id",
	"sku",
	"barcode",
	"price",
	"sale_price",
	"price_minor",
	"sale_price_minor",
	"stock_quantity",
	"low_stock_threshold",
	"is_active",
	"option_combination_key"
)
SELECT
	"id",
	"sku",
	"barcode",
	"price",
	"sale_price",
	ROUND("price" * 100)::integer,
	CASE WHEN "sale_price" IS NOT NULL THEN ROUND("sale_price" * 100)::integer ELSE NULL END,
	"stock",
	"low_stock_threshold",
	"is_active",
	'default'
FROM "products"
ON CONFLICT ("sku") DO NOTHING;
