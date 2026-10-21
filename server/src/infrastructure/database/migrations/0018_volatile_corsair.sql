CREATE TYPE "public"."admin_notification_severity" AS ENUM('info', 'success', 'warning', 'error');--> statement-breakpoint
ALTER TYPE "public"."refund_status" ADD VALUE 'partial' BEFORE 'processed';--> statement-breakpoint
CREATE TABLE "admin_notification_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_key" varchar(255) NOT NULL,
	"type" varchar(60) NOT NULL,
	"severity" "admin_notification_severity" DEFAULT 'info' NOT NULL,
	"title" varchar(160) NOT NULL,
	"message" varchar(500) NOT NULL,
	"entity_type" varchar(60),
	"entity_id" uuid,
	"destination" varchar(300),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_notification_recipients" ADD CONSTRAINT "admin_notification_recipients_notification_id_admin_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."admin_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_notification_recipients" ADD CONSTRAINT "admin_notification_recipients_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_notification_recipients_notification_admin_uidx" ON "admin_notification_recipients" USING btree ("notification_id","admin_user_id");--> statement-breakpoint
CREATE INDEX "admin_notification_recipients_admin_read_idx" ON "admin_notification_recipients" USING btree ("admin_user_id","read_at");--> statement-breakpoint
CREATE INDEX "admin_notification_recipients_admin_created_idx" ON "admin_notification_recipients" USING btree ("admin_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_notifications_event_key_uidx" ON "admin_notifications" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "admin_notifications_created_at_idx" ON "admin_notifications" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "admin_notifications_type_idx" ON "admin_notifications" USING btree ("type");