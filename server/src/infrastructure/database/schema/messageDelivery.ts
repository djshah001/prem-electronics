import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const messageChannelEnum = pgEnum('message_channel', ['sms', 'whatsapp']);
export const messagePurposeEnum = pgEnum('message_purpose', ['transactional', 'marketing']);
export const messageDeliveryStatusEnum = pgEnum('message_delivery_status', [
  'queued', 'submitting', 'provider_accepted', 'failed', 'cancelled',
]);

export const messageDeliveryJobs = pgTable('message_delivery_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  channel: messageChannelEnum('channel').notNull(),
  purpose: messagePurposeEnum('purpose').notNull(),
  eventKey: varchar('event_key', { length: 80 }).notNull(),
  campaignRecipientId: uuid('campaign_recipient_id'),
  recipient: varchar('recipient', { length: 20 }).notNull(),
  templateKey: varchar('template_key', { length: 160 }).notNull(),
  language: varchar('language', { length: 20 }),
  variables: jsonb('variables').$type<Record<string, unknown>>().default({}).notNull(),
  status: messageDeliveryStatusEnum('status').default('queued').notNull(),
  dedupeKey: varchar('dedupe_key', { length: 180 }).notNull().unique(),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  leaseOwner: varchar('lease_owner', { length: 100 }),
  leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
  providerMessageId: varchar('provider_message_id', { length: 255 }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  lastError: varchar('last_error', { length: 1000 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('message_delivery_jobs_queue_idx').on(table.status, table.nextAttemptAt),
  index('message_delivery_jobs_campaign_recipient_idx').on(table.campaignRecipientId),
]);

export const mobileMarketingPreferences = pgTable('mobile_marketing_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  phone: varchar('phone', { length: 20 }).notNull(),
  whatsappOptedIn: boolean('whatsapp_opted_in').default(false).notNull(),
  provenance: varchar('provenance', { length: 80 }).notNull(),
  consentedAt: timestamp('consented_at', { withTimezone: true }),
  withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('mobile_marketing_preferences_user_uidx').on(table.userId),
  uniqueIndex('mobile_marketing_preferences_phone_uidx').on(table.phone),
]);

export const whatsappMarketingSuppressions = pgTable('whatsapp_marketing_suppressions', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  reason: varchar('reason', { length: 80 }).notNull(),
  source: varchar('source', { length: 80 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type MessageDeliveryJob = typeof messageDeliveryJobs.$inferSelect;
