import { pgTable, uuid, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { coupons } from './coupons.js';
import { users } from './users.js';
import { orders } from './orders.js';

export const couponRedemptions = pgTable('coupon_redemptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orderUnique: uniqueIndex('coupon_redemptions_order_unique').on(table.orderId),
  userCouponIndex: index('coupon_redemptions_user_coupon_idx').on(table.userId, table.couponId),
}));

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(coupons, { fields: [couponRedemptions.couponId], references: [coupons.id] }),
  user: one(users, { fields: [couponRedemptions.userId], references: [users.id] }),
  order: one(orders, { fields: [couponRedemptions.orderId], references: [orders.id] }),
}));
