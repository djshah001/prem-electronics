import { pgTable, uuid, varchar, integer, numeric, json, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { orders } from './orders.js';
import { products } from './products.js';
import { productVariants } from './productVariants.js';

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  productTitle: varchar('product_title', { length: 512 }),
  categoryIdSnapshot: uuid('category_id_snapshot'),
  categoryNameSnapshot: varchar('category_name_snapshot', { length: 100 }),
  categorySnapshotSource: varchar('category_snapshot_source', { length: 20 }).default('historical').notNull(),
  quantity: integer('quantity').notNull(),
  priceAtPurchase: numeric('price_at_purchase', { precision: 10, scale: 2 }).notNull(),
  skuSnapshot: varchar('sku_snapshot', { length: 100 }),
  imageSnapshot: varchar('image_snapshot', { length: 1000 }),
  hsnCodeSnapshot: varchar('hsn_code_snapshot', { length: 20 }),
  unitPriceMinor: integer('unit_price_minor').default(0).notNull(),
  discountMinor: integer('discount_minor').default(0).notNull(),
  taxableMinor: integer('taxable_minor').default(0).notNull(),
  gstRateBps: integer('gst_rate_bps').default(0).notNull(),
  cgstMinor: integer('cgst_minor').default(0).notNull(),
  sgstMinor: integer('sgst_minor').default(0).notNull(),
  igstMinor: integer('igst_minor').default(0).notNull(),
  lineTotalMinor: integer('line_total_minor').default(0).notNull(),
  variantSnapshot: json('variant_snapshot').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }),
}));

export const insertOrderItemSchema = createInsertSchema(orderItems);
export const selectOrderItemSchema = createSelectSchema(orderItems);

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
