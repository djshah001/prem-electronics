import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { users } from './users.js';

export const orderStatusEvents = pgTable('order_status_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 40 }).notNull(),
  fromValue: varchar('from_value', { length: 40 }),
  toValue: varchar('to_value', { length: 40 }).notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('order_status_events_order_created_idx').on(table.orderId, table.createdAt),
]);

export type OrderStatusEvent = typeof orderStatusEvents.$inferSelect;
