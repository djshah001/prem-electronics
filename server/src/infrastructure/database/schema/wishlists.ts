import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users.js';
import { products } from './products.js';

export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.userId, table.productId),
  ]
);

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, { fields: [wishlists.userId], references: [users.id] }),
  product: one(products, { fields: [wishlists.productId], references: [products.id] }),
}));

export const insertWishlistSchema = createInsertSchema(wishlists);
export const selectWishlistSchema = createSelectSchema(wishlists);

export type Wishlist = typeof wishlists.$inferSelect;
export type NewWishlist = typeof wishlists.$inferInsert;
