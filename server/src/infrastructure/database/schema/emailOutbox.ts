import { pgTable, uuid, varchar, jsonb, timestamp, pgEnum, index, integer } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';

export const emailOutboxStatusEnum = pgEnum('email_outbox_status', [
  'pending',
  'sent',
  'failed',
]);

export const emailOutbox = pgTable('email_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .references(() => orders.id, { onDelete: 'set null' }),
  kind: varchar('kind', { length: 50 }).notNull(),
  recipient: varchar('recipient', { length: 255 }).notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  status: emailOutboxStatusEnum('status').default('pending').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  lastError: varchar('last_error', { length: 500 }),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('email_outbox_pending_idx').on(table.status, table.nextAttemptAt),
]);

export type EmailOutboxEntry = typeof emailOutbox.$inferSelect;
