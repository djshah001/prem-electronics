CREATE TYPE "public"."campaign_channel" AS ENUM('email', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."message_channel" AS ENUM('sms', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."message_delivery_status" AS ENUM('queued', 'submitting', 'provider_accepted', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."message_purpose" AS ENUM('transactional', 'marketing');--> statement-breakpoint
ALTER TYPE "public"."campaign_recipient_status" ADD VALUE 'provider_accepted' BEFORE 'failed';--> statement-breakpoint
CREATE TABLE "message_delivery_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "message_channel" NOT NULL,
	"purpose" "message_purpose" NOT NULL,
	"event_key" varchar(80) NOT NULL,
	"campaign_recipient_id" uuid,
	"recipient" varchar(20) NOT NULL,
	"template_key" varchar(160) NOT NULL,
	"language" varchar(20),
	"variables" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "message_delivery_status" DEFAULT 'queued' NOT NULL,
	"dedupe_key" varchar(180) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_owner" varchar(100),
	"lease_expires_at" timestamp with time zone,
	"provider_message_id" varchar(255),
	"accepted_at" timestamp with time zone,
	"last_error" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_delivery_jobs_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "mobile_marketing_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone" varchar(20) NOT NULL,
	"whatsapp_opted_in" boolean DEFAULT false NOT NULL,
	"provenance" varchar(80) NOT NULL,
	"consented_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_marketing_suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"reason" varchar(80) NOT NULL,
	"source" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_marketing_suppressions_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "campaign_recipients" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "template_version_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD COLUMN "message_delivery_job_id" uuid;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "channel" "campaign_channel" DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "whatsapp_template_name" varchar(160);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "whatsapp_template_language" varchar(20);--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "whatsapp_body_variables" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "mobile_marketing_preferences" ADD CONSTRAINT "mobile_marketing_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_delivery_jobs_queue_idx" ON "message_delivery_jobs" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "message_delivery_jobs_campaign_recipient_idx" ON "message_delivery_jobs" USING btree ("campaign_recipient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mobile_marketing_preferences_user_uidx" ON "mobile_marketing_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mobile_marketing_preferences_phone_uidx" ON "mobile_marketing_preferences" USING btree ("phone");--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_message_delivery_job_id_message_delivery_jobs_id_fk" FOREIGN KEY ("message_delivery_job_id") REFERENCES "public"."message_delivery_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_recipients_phone_uidx" ON "campaign_recipients" USING btree ("campaign_id","phone");