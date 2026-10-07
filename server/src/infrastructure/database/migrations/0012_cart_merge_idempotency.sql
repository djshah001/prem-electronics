CREATE TABLE IF NOT EXISTS "cart_merge_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "idempotency_token" varchar(100) NOT NULL,
  "result" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cart_merge_operations_user_token_unique" ON "cart_merge_operations" ("user_id", "idempotency_token");
