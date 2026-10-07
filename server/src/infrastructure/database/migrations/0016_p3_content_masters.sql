DO $$ BEGIN CREATE TYPE "master_status" AS ENUM ('draft', 'published', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "email_delivery_status" AS ENUM ('queued', 'render_failed', 'submitting', 'smtp_accepted', 'failed', 'unknown', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "campaign_status" AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "campaign_recipient_status" AS ENUM ('pending', 'suppressed', 'queued', 'smtp_accepted', 'failed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "invoice_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(120) NOT NULL, "document_type" varchar(40) NOT NULL DEFAULT 'tax_invoice',
  "status" "master_status" NOT NULL DEFAULT 'draft', "is_default" boolean NOT NULL DEFAULT false, "draft_config" jsonb NOT NULL,
  "draft_revision" integer NOT NULL DEFAULT 1, "active_version_id" uuid, "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "invoice_templates_status_idx" ON "invoice_templates" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_templates_default_type_uidx" ON "invoice_templates" ("document_type") WHERE "is_default" = true;
CREATE TABLE IF NOT EXISTS "invoice_template_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "template_id" uuid NOT NULL REFERENCES "invoice_templates"("id") ON DELETE RESTRICT,
  "version" integer NOT NULL, "config" jsonb NOT NULL, "change_note" varchar(500),
  "published_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "published_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_template_versions_number_uidx" ON "invoice_template_versions" ("template_id", "version");
DO $$ BEGIN ALTER TABLE "invoice_templates" ADD CONSTRAINT "invoice_templates_active_version_fk" FOREIGN KEY ("active_version_id") REFERENCES "invoice_template_versions"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "issued_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT,
  "template_version_id" uuid REFERENCES "invoice_template_versions"("id") ON DELETE RESTRICT, "invoice_number" varchar(40) NOT NULL,
  "order_snapshot" jsonb NOT NULL, "seller_snapshot" jsonb NOT NULL, "buyer_snapshot" jsonb NOT NULL, "template_snapshot" jsonb NOT NULL,
  "renderer_version" varchar(30) NOT NULL DEFAULT 'pdfkit-a4-v1', "pdf_sha256" varchar(64) NOT NULL, "pdf_bytes" bytea NOT NULL,
  "page_count" integer NOT NULL, "is_legacy" boolean NOT NULL DEFAULT false, "issued_at" timestamptz NOT NULL DEFAULT now(), "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "issued_invoices_order_uidx" ON "issued_invoices" ("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "issued_invoices_number_uidx" ON "issued_invoices" ("invoice_number");

CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "event_key" varchar(80) NOT NULL UNIQUE, "name" varchar(140) NOT NULL,
  "category" varchar(30) NOT NULL, "status" "master_status" NOT NULL DEFAULT 'draft', "subject_draft" varchar(255) NOT NULL,
  "preheader_draft" varchar(255), "document_draft" jsonb NOT NULL, "required_variables" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "draft_revision" integer NOT NULL DEFAULT 1, "active_version_id" uuid, "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "email_templates_category_status_idx" ON "email_templates" ("category", "status");
CREATE TABLE IF NOT EXISTS "email_template_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "template_id" uuid NOT NULL REFERENCES "email_templates"("id") ON DELETE RESTRICT,
  "version" integer NOT NULL, "subject" varchar(255) NOT NULL, "preheader" varchar(255), "document" jsonb NOT NULL,
  "html" text NOT NULL, "plain_text" text NOT NULL, "required_variables" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "change_note" varchar(500), "published_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "published_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_template_versions_number_uidx" ON "email_template_versions" ("template_id", "version");
DO $$ BEGIN ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_active_version_fk" FOREIGN KEY ("active_version_id") REFERENCES "email_template_versions"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "email_delivery_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "event_key" varchar(80) NOT NULL,
  "template_version_id" uuid REFERENCES "email_template_versions"("id") ON DELETE RESTRICT, "order_id" uuid REFERENCES "orders"("id") ON DELETE SET NULL,
  "campaign_recipient_id" uuid, "recipient" varchar(255) NOT NULL, "variables" jsonb NOT NULL,
  "subject_snapshot" varchar(255), "html_snapshot" text, "text_snapshot" text, "status" "email_delivery_status" NOT NULL DEFAULT 'queued',
  "priority" integer NOT NULL DEFAULT 50, "dedupe_key" varchar(180) NOT NULL UNIQUE, "attempts" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 5, "next_attempt_at" timestamptz NOT NULL DEFAULT now(), "expires_at" timestamptz,
  "lease_owner" varchar(100), "lease_expires_at" timestamptz, "provider_message_id" varchar(255), "accepted_at" timestamptz,
  "last_error" varchar(1000), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "email_delivery_jobs_queue_idx" ON "email_delivery_jobs" ("status", "next_attempt_at", "priority");
CREATE TABLE IF NOT EXISTS "email_send_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "job_id" uuid NOT NULL REFERENCES "email_delivery_jobs"("id") ON DELETE CASCADE,
  "attempt_number" integer NOT NULL, "status" "email_delivery_status" NOT NULL, "provider_message_id" varchar(255), "error" varchar(1000),
  "started_at" timestamptz NOT NULL DEFAULT now(), "completed_at" timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_send_attempts_number_uidx" ON "email_send_attempts" ("job_id", "attempt_number");

CREATE TABLE IF NOT EXISTS "marketing_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "email" varchar(255) NOT NULL, "opted_in" boolean NOT NULL DEFAULT false, "provenance" varchar(80) NOT NULL,
  "consented_at" timestamptz, "withdrawn_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "marketing_preferences_email_uidx" ON "marketing_preferences" ("email");
CREATE TABLE IF NOT EXISTS "marketing_suppressions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "email" varchar(255) NOT NULL UNIQUE, "reason" varchar(80) NOT NULL,
  "source" varchar(80) NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(160) NOT NULL, "status" "campaign_status" NOT NULL DEFAULT 'draft',
  "template_version_id" uuid NOT NULL REFERENCES "email_template_versions"("id") ON DELETE RESTRICT,
  "audience_definition" jsonb NOT NULL DEFAULT '{"optedIn":true}'::jsonb, "scheduled_at" timestamptz, "recipient_snapshot_at" timestamptz,
  "started_at" timestamptz, "completed_at" timestamptz, "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "campaigns_status_schedule_idx" ON "campaigns" ("status", "scheduled_at");
CREATE TABLE IF NOT EXISTS "campaign_recipients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "campaign_id" uuid NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL, "email" varchar(255) NOT NULL, "variables" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" "campaign_recipient_status" NOT NULL DEFAULT 'pending', "suppression_reason" varchar(120),
  "delivery_job_id" uuid REFERENCES "email_delivery_jobs"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_recipients_email_uidx" ON "campaign_recipients" ("campaign_id", "email");
CREATE INDEX IF NOT EXISTS "campaign_recipients_status_idx" ON "campaign_recipients" ("campaign_id", "status");
DO $$ BEGIN ALTER TABLE "email_delivery_jobs" ADD CONSTRAINT "email_delivery_jobs_campaign_recipient_fk" FOREIGN KEY ("campaign_recipient_id") REFERENCES "campaign_recipients"("id") ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "content_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "entity_type" varchar(50) NOT NULL, "entity_id" uuid NOT NULL,
  "action" varchar(50) NOT NULL, "actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "content_audit_events_entity_idx" ON "content_audit_events" ("entity_type", "entity_id", "created_at");

ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "editor_json" jsonb;
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "editor_schema_version" integer NOT NULL DEFAULT 1;
ALTER TABLE "blogs" ADD COLUMN IF NOT EXISTS "editor_migration_status" varchar(30) NOT NULL DEFAULT 'legacy_html';
ALTER TABLE "blog_content_revisions" ADD COLUMN IF NOT EXISTS "editor_json" jsonb;
