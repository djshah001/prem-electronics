import { pgTable, uuid, varchar, numeric, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { orders } from './orders.js';
import { couponRedemptions } from './couponRedemptions.js';

export const discountTypeEnum = pgEnum('discount_type', ['flat', 'percentage']);

export const coupons = pgTable('coupons', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  discountType: discountTypeEnum('discount_type').notNull(),
  discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
  minPurchase: numeric('min_purchase', { precision: 10, scale: 2 }).default('0'),
  maxDiscount: numeric('max_discount', { precision: 10, scale: 2 }),
  usageLimit: integer('usage_limit'),
  perUserLimit: integer('per_user_limit'),
  firstOrderOnly: boolean('first_order_only').default(false).notNull(),
  usedCount: integer('used_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const couponsRelations = relations(coupons, ({ many }) => ({
  orders: many(orders),
  redemptions: many(couponRedemptions),
}));

export const insertCouponSchema = createInsertSchema(coupons);
export const selectCouponSchema = createSelectSchema(coupons);

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
