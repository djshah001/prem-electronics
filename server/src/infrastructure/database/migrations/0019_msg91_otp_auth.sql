CREATE TYPE "public"."otp_challenge_status" AS ENUM('sending', 'sent', 'verifying', 'verified', 'consumed', 'expired', 'failed', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."otp_provider" AS ENUM('msg91_widget', 'fake');--> statement-breakpoint
CREATE TYPE "public"."otp_purpose" AS ENUM('customer_login', 'admin_login', 'phone_change_current', 'phone_change_new');--> statement-breakpoint
CREATE TABLE "auth_identity_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"previous_phone_hash" varchar(64),
	"next_phone_hash" varchar(64),
	"actor" varchar(100) NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_phone" varchar(20) NOT NULL,
	"purpose" "otp_purpose" NOT NULL,
	"bound_user_id" uuid,
	"binding_hash" varchar(64) NOT NULL,
	"provider" "otp_provider" NOT NULL,
	"provider_request_ref" text,
	"generation" integer DEFAULT 1 NOT NULL,
	"status" "otp_challenge_status" DEFAULT 'sending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"resend_count" integer DEFAULT 0 NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"device_hash" varchar(64) NOT NULL,
	"safe_error_category" varchar(40),
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"resend_available_at" timestamp with time zone NOT NULL,
	"processing_lease_until" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"continuation_hash" varchar(64),
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_phone_e164" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth_identity_audit_events" ADD CONSTRAINT "auth_identity_audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_bound_user_id_users_id_fk" FOREIGN KEY ("bound_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_identity_audit_user_idx" ON "auth_identity_audit_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_phone_purpose_idx" ON "otp_challenges" USING btree ("canonical_phone","purpose","created_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_ip_created_idx" ON "otp_challenges" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_status_expiry_idx" ON "otp_challenges" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "otp_challenges_user_purpose_idx" ON "otp_challenges" USING btree ("bound_user_id","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_phone_e164_unique" ON "users" USING btree ("auth_phone_e164");
--> statement-breakpoint
-- Cutover safety: existing profiles are complete, but no historical contact phone is trusted.
-- Private mapping tooling must explicitly populate auth_phone_e164 and phone_verified_at.
UPDATE "users"
SET "onboarding_completed_at" = COALESCE("onboarding_completed_at", "created_at"),
    "otp_token" = NULL,
    "otp_expiry" = NULL,
    "reset_token" = NULL,
    "reset_token_expiry" = NULL;
--> statement-breakpoint
-- Old JWTs omit AUTH_TOKEN_VERSION and are rejected. Revoke their persisted refresh sessions too.
UPDATE "auth_sessions" SET "revoked_at" = COALESCE("revoked_at", now());
--> statement-breakpoint
-- Retire email OTP/password-reset content without deleting its audit history.
UPDATE "email_templates" SET "status" = 'archived', "archived_at" = COALESCE("archived_at", now()), "updated_at" = now()
WHERE "event_key" IN ('otp_verification', 'password_reset');
--> statement-breakpoint
UPDATE "email_delivery_jobs" SET "status" = 'cancelled', "last_error" = 'Retired by mobile OTP authentication cutover', "updated_at" = now()
WHERE "event_key" IN ('otp_verification', 'password_reset') AND "status" = 'queued';
