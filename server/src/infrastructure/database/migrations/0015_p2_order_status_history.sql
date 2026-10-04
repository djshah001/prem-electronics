CREATE TABLE IF NOT EXISTS "order_status_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE cascade,
  "event_type" varchar(40) NOT NULL,
  "from_value" varchar(40),
  "to_value" varchar(40) NOT NULL,
  "actor_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_status_events_order_created_idx" ON "order_status_events" ("order_id", "created_at");
--> statement-breakpoint
INSERT INTO "order_status_events" ("order_id", "event_type", "to_value", "metadata", "created_at")
SELECT o."id", 'legacy_snapshot', o."status"::text,
       jsonb_build_object('paymentStatus', o."payment_status", 'returnStatus', o."return_status", 'refundStatus', o."refund_status", 'source', 'migration'),
       o."created_at"
FROM "orders" o
WHERE NOT EXISTS (SELECT 1 FROM "order_status_events" e WHERE e."order_id" = o."id");
