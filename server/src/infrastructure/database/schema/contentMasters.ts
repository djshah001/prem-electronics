import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { users } from './users.js';
import { sql } from 'drizzle-orm';

export type StructuredContent = {
  type: 'doc';
  content?: Array<Record<string, unknown>>;
};

export type InvoiceTemplateConfig = {
  page: { size: 'A4'; marginMm: number; repeatTableHeader: boolean; showPageNumbers: boolean };
  labels: Record<string, string>;
  sections: Array<{ key: string; visible: boolean; order: number }>;
  merchant: {
    name: string;
    gstin?: string;
    pan?: string;
    address?: string;
    state?: string;
    stateCode?: string;
    phone?: string;
    email?: string;
    bankDetails?: string;
    declaration?: string;
    signatureLabel?: string;
  };
  terms?: string;
};

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' });

export const masterStatusEnum = pgEnum('master_status', ['draft', 'published', 'archived']);
export const emailDeliveryStatusEnum = pgEnum('email_delivery_status', [
  'queued', 'render_failed', 'submitting', 'smtp_accepted', 'failed', 'unknown', 'cancelled',
]);
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled',
]);
export const campaignRecipientStatusEnum = pgEnum('campaign_recipient_status', [
  'pending', 'suppressed', 'queued', 'smtp_accepted', 'failed', 'cancelled',
]);

export const invoiceTemplates = pgTable('invoice_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(),
  documentType: varchar('document_type', { length: 40 }).default('tax_invoice').notNull(),
  status: masterStatusEnum('status').default('draft').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  draftConfig: jsonb('draft_config').$type<InvoiceTemplateConfig>().notNull(),
  draftRevision: integer('draft_revision').default(1).notNull(),
  activeVersionId: uuid('active_version_id'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('invoice_templates_status_idx').on(table.status),
  uniqueIndex('invoice_templates_default_type_uidx').on(table.documentType).where(sql`${table.isDefault} = true`),
]);

export const invoiceTemplateVersions = pgTable('invoice_template_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => invoiceTemplates.id, { onDelete: 'restrict' }),
  version: integer('version').notNull(),
  config: jsonb('config').$type<InvoiceTemplateConfig>().notNull(),
  changeNote: varchar('change_note', { length: 500 }),
  publishedBy: uuid('published_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('invoice_template_versions_number_uidx').on(table.templateId, table.version)]);

export const issuedInvoices = pgTable('issued_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  templateVersionId: uuid('template_version_id').references(() => invoiceTemplateVersions.id, { onDelete: 'restrict' }),
  invoiceNumber: varchar('invoice_number', { length: 40 }).notNull(),
  orderSnapshot: jsonb('order_snapshot').$type<Record<string, unknown>>().notNull(),
  sellerSnapshot: jsonb('seller_snapshot').$type<Record<string, unknown>>().notNull(),
  buyerSnapshot: jsonb('buyer_snapshot').$type<Record<string, unknown>>().notNull(),
  templateSnapshot: jsonb('template_snapshot').$type<InvoiceTemplateConfig>().notNull(),
  rendererVersion: varchar('renderer_version', { length: 30 }).default('pdfkit-a4-v1').notNull(),
  pdfSha256: varchar('pdf_sha256', { length: 64 }).notNull(),
  pdfBytes: bytea('pdf_bytes').notNull(),
  pageCount: integer('page_count').notNull(),
  isLegacy: boolean('is_legacy').default(false).notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('issued_invoices_order_uidx').on(table.orderId),
  uniqueIndex('issued_invoices_number_uidx').on(table.invoiceNumber),
]);

export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventKey: varchar('event_key', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 140 }).notNull(),
  category: varchar('category', { length: 30 }).notNull(),
  status: masterStatusEnum('status').default('draft').notNull(),
  subjectDraft: varchar('subject_draft', { length: 255 }).notNull(),
  preheaderDraft: varchar('preheader_draft', { length: 255 }),
  documentDraft: jsonb('document_draft').$type<StructuredContent>().notNull(),
  requiredVariables: jsonb('required_variables').$type<string[]>().default([]).notNull(),
  draftRevision: integer('draft_revision').default(1).notNull(),
  activeVersionId: uuid('active_version_id'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('email_templates_category_status_idx').on(table.category, table.status)]);

export const emailTemplateVersions = pgTable('email_template_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => emailTemplates.id, { onDelete: 'restrict' }),
  version: integer('version').notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  preheader: varchar('preheader', { length: 255 }),
  document: jsonb('document').$type<StructuredContent>().notNull(),
  html: text('html').notNull(),
  plainText: text('plain_text').notNull(),
  requiredVariables: jsonb('required_variables').$type<string[]>().default([]).notNull(),
  changeNote: varchar('change_note', { length: 500 }),
  publishedBy: uuid('published_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('email_template_versions_number_uidx').on(table.templateId, table.version)]);

export const emailDeliveryJobs = pgTable('email_delivery_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventKey: varchar('event_key', { length: 80 }).notNull(),
  templateVersionId: uuid('template_version_id').references(() => emailTemplateVersions.id, { onDelete: 'restrict' }),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  campaignRecipientId: uuid('campaign_recipient_id'),
  recipient: varchar('recipient', { length: 255 }).notNull(),
  variables: jsonb('variables').$type<Record<string, unknown>>().notNull(),
  subjectSnapshot: varchar('subject_snapshot', { length: 255 }),
  htmlSnapshot: text('html_snapshot'),
  textSnapshot: text('text_snapshot'),
  status: emailDeliveryStatusEnum('status').default('queued').notNull(),
  priority: integer('priority').default(50).notNull(),
  dedupeKey: varchar('dedupe_key', { length: 180 }).notNull().unique(),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(5).notNull(),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  leaseOwner: varchar('lease_owner', { length: 100 }),
  leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
  providerMessageId: varchar('provider_message_id', { length: 255 }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  lastError: varchar('last_error', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('email_delivery_jobs_queue_idx').on(table.status, table.nextAttemptAt, table.priority)]);

export const emailSendAttempts = pgTable('email_send_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').notNull().references(() => emailDeliveryJobs.id, { onDelete: 'cascade' }),
  attemptNumber: integer('attempt_number').notNull(),
  status: emailDeliveryStatusEnum('status').notNull(),
  providerMessageId: varchar('provider_message_id', { length: 255 }),
  error: varchar('error', { length: 1000 }),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [uniqueIndex('email_send_attempts_number_uidx').on(table.jobId, table.attemptNumber)]);

export const marketingPreferences = pgTable('marketing_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  optedIn: boolean('opted_in').default(false).notNull(),
  provenance: varchar('provenance', { length: 80 }).notNull(),
  consentedAt: timestamp('consented_at', { withTimezone: true }),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex('marketing_preferences_email_uidx').on(table.email)]);

export const marketingSuppressions = pgTable('marketing_suppressions', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  reason: varchar('reason', { length: 80 }).notNull(),
  source: varchar('source', { length: 80 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 160 }).notNull(),
  status: campaignStatusEnum('status').default('draft').notNull(),
  templateVersionId: uuid('template_version_id').notNull().references(() => emailTemplateVersions.id, { onDelete: 'restrict' }),
  audienceDefinition: jsonb('audience_definition').$type<Record<string, unknown>>().default({ optedIn: true }).notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  recipientSnapshotAt: timestamp('recipient_snapshot_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('campaigns_status_schedule_idx').on(table.status, table.scheduledAt)]);

export const campaignRecipients = pgTable('campaign_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull(),
  variables: jsonb('variables').$type<Record<string, unknown>>().default({}).notNull(),
  status: campaignRecipientStatusEnum('status').default('pending').notNull(),
  suppressionReason: varchar('suppression_reason', { length: 120 }),
  deliveryJobId: uuid('delivery_job_id').references(() => emailDeliveryJobs.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('campaign_recipients_email_uidx').on(table.campaignId, table.email),
  index('campaign_recipients_status_idx').on(table.campaignId, table.status),
]);

export const contentAuditEvents = pgTable('content_audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('content_audit_events_entity_idx').on(table.entityType, table.entityId, table.createdAt)]);
