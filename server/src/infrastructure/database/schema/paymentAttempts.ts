import { pgTable, uuid, varchar, integer, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './orders.js';

export const paymentAttemptStatusEnum = pgEnum('payment_attempt_status', [
  'created',
  'captured',
  'failed',
  'refunded',
]);

export const paymentAttempts = pgTable('payment_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'restrict' }),
  provider: varchar('provider', { length: 30 }).default('razorpay').notNull(),
  providerOrderId: varchar('provider_order_id', { length: 100 }).notNull(),
  providerPaymentId: varchar('provider_payment_id', { length: 100 }).unique(),
  amountMinor: integer('amount_minor').notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  status: paymentAttemptStatusEnum('status').default('created').notNull(),
  failureReason: varchar('failure_reason', { length: 500 }),
  capturedAt: timestamp('captured_at', { withTimezone: true }),
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('payment_attempts_order_id_idx').on(table.orderId),
  index('payment_attempts_provider_order_id_idx').on(table.providerOrderId),
  index('payment_attempts_status_captured_at_idx').on(table.status, table.capturedAt),
]);

export const paymentAttemptsRelations = relations(paymentAttempts, ({ one }) => ({
  order: one(orders, { fields: [paymentAttempts.orderId], references: [orders.id] }),
}));

export type PaymentAttempt = typeof paymentAttempts.$inferSelect;
