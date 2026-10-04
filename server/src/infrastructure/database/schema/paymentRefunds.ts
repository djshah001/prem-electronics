import { pgEnum, pgTable, uuid, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { orders } from './orders.js';
import { paymentAttempts } from './paymentAttempts.js';

export const paymentRefundStatusEnum = pgEnum('payment_refund_status', [
  'pending', 'processed', 'failed',
]);

export const paymentRefunds = pgTable('payment_refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  paymentAttemptId: uuid('payment_attempt_id').notNull().references(() => paymentAttempts.id, { onDelete: 'restrict' }),
  providerRefundId: varchar('provider_refund_id', { length: 100 }).unique(),
  amountMinor: integer('amount_minor').notNull(),
  merchandiseMinor: integer('merchandise_minor'),
  taxMinor: integer('tax_minor'),
  shippingMinor: integer('shipping_minor'),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  status: paymentRefundStatusEnum('status').default('pending').notNull(),
  failureReason: varchar('failure_reason', { length: 500 }),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('payment_refunds_order_id_idx').on(table.orderId),
  index('payment_refunds_attempt_id_idx').on(table.paymentAttemptId),
  index('payment_refunds_status_processed_at_idx').on(table.status, table.processedAt),
]);

export const paymentRefundsRelations = relations(paymentRefunds, ({ one }) => ({
  order: one(orders, { fields: [paymentRefunds.orderId], references: [orders.id] }),
  paymentAttempt: one(paymentAttempts, { fields: [paymentRefunds.paymentAttemptId], references: [paymentAttempts.id] }),
}));

export type PaymentRefund = typeof paymentRefunds.$inferSelect;
