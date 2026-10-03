import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const webhookEventStatusEnum = pgEnum('webhook_event_status', [
  'processing',
  'processed',
  'failed',
  'ignored',
]);

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: varchar('provider', { length: 30 }).default('razorpay').notNull(),
  eventId: varchar('event_id', { length: 128 }).notNull().unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payloadHash: varchar('payload_hash', { length: 64 }).notNull(),
  status: webhookEventStatusEnum('status').default('processing').notNull(),
  error: varchar('error', { length: 500 }),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;

