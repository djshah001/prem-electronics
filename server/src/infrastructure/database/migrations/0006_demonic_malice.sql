CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "per_user_limit" integer;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "first_order_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_redemptions_order_unique" ON "coupon_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_user_coupon_idx" ON "coupon_redemptions" USING btree ("user_id","coupon_id");--> statement-breakpoint
INSERT INTO "coupon_redemptions" ("coupon_id", "user_id", "order_id")
SELECT "coupon_id", "user_id", "id" FROM "orders"
WHERE "coupon_id" IS NOT NULL AND "user_id" IS NOT NULL AND "payment_status" = 'paid'
ON CONFLICT ("order_id") DO NOTHING;--> statement-breakpoint
UPDATE "coupons"
SET "usage_limit" = NULL, "per_user_limit" = 1, "first_order_only" = true, "updated_at" = now()
WHERE "code" = 'FIRSTORDER10';
