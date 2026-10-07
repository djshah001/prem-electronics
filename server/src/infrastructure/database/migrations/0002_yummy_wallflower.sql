ALTER TABLE "products" ALTER COLUMN "images" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "images" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "attributes" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "attributes" SET DEFAULT '{}'::jsonb;