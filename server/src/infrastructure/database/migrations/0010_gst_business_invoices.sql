CREATE TABLE IF NOT EXISTS "gst_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "gstin" varchar(15) NOT NULL,
  "provider" varchar(30) NOT NULL,
  "registration_status" varchar(40) NOT NULL,
  "legal_name" varchar(255) NOT NULL,
  "trade_name" varchar(255),
  "taxpayer_type" varchar(100),
  "state_code" varchar(2) NOT NULL,
  "state_name" varchar(100) NOT NULL,
  "principal_address" jsonb,
  "additional_addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "provider_payload" jsonb,
  "checked_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "gst_verifications_gstin_format_check" CHECK ("gstin" ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  CONSTRAINT "gst_verifications_state_code_check" CHECK ("state_code" ~ '^[0-9]{2}$')
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gst_verifications_owner_gstin_idx" ON "gst_verifications" ("user_id", "gstin");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "verification_id" uuid NOT NULL REFERENCES "gst_verifications"("id") ON DELETE restrict,
  "nickname" varchar(100),
  "gstin" varchar(15) NOT NULL,
  "legal_name" varchar(255) NOT NULL,
  "trade_name" varchar(255),
  "taxpayer_type" varchar(100),
  "registration_status" varchar(40) NOT NULL,
  "registration_state_code" varchar(2) NOT NULL,
  "registration_state_name" varchar(100) NOT NULL,
  "registered_address" jsonb,
  "billing_address" jsonb NOT NULL,
  "contact_person" varchar(100),
  "contact_phone" varchar(20),
  "contact_email" varchar(255),
  "is_default" boolean DEFAULT false NOT NULL,
  "is_archived" boolean DEFAULT false NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "verified_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "business_profiles_version_check" CHECK ("version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "business_profiles_owner_gstin_unique" ON "business_profiles" ("user_id", "gstin");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "business_profiles_one_default_per_user" ON "business_profiles" ("user_id") WHERE "is_default" = true AND "is_archived" = false;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_profiles_owner_active_idx" ON "business_profiles" ("user_id", "is_archived");
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "hsn_code" varchar(20);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "gst_rate_bps" integer;
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_gst_rate_bps_check";
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_gst_rate_bps_check" CHECK ("gst_rate_bps" IS NULL OR ("gst_rate_bps" >= 0 AND "gst_rate_bps" <= 10000));
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "purchase_type" varchar(20) DEFAULT 'personal' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "business_profile_id" uuid REFERENCES "business_profiles"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "buyer_business_snapshot" json;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "seller_snapshot" json;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "billing_address" json;
--> statement-breakpoint
UPDATE "orders" SET "billing_address" = "shipping_address" WHERE "billing_address" IS NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tax_snapshot" json;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pricing_policy_version" varchar(50) DEFAULT 'legacy' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "purchase_order_reference" varchar(100);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_number" varchar(40);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_issued_at" timestamp with time zone;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_invoice_number_unique" ON "orders" ("invoice_number") WHERE "invoice_number" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_purchase_type_check";
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_purchase_type_check" CHECK ("purchase_type" IN ('personal', 'company'));
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "sku_snapshot" varchar(100);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "image_snapshot" varchar(1000);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "hsn_code_snapshot" varchar(20);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "unit_price_minor" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "discount_minor" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "taxable_minor" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gst_rate_bps" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "cgst_minor" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "sgst_minor" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "igst_minor" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "line_total_minor" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "order_items" SET
  "unit_price_minor" = ROUND("price_at_purchase" * 100)::integer,
  "taxable_minor" = ROUND("price_at_purchase" * "quantity" * 100)::integer,
  "line_total_minor" = ROUND("price_at_purchase" * "quantity" * 100)::integer
WHERE "unit_price_minor" = 0;
