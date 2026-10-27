CREATE TYPE "public"."navbar_item_type" AS ENUM('all_categories', 'category', 'custom_link');--> statement-breakpoint
CREATE TABLE "navbar_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(120) NOT NULL,
	"type" "navbar_item_type" NOT NULL,
	"category_id" uuid,
	"href" text,
	"icon_name" varchar(60),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "navbar_items" ADD CONSTRAINT "navbar_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;