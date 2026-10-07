import { pgTable, uuid, varchar, boolean, pgEnum, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users.js';

export const addressTypeEnum = pgEnum('address_type', ['shipping', 'billing', 'both']);

export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: addressTypeEnum('type').default('shipping').notNull(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  street: varchar('street', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  pincode: varchar('pincode', { length: 10 }).notNull(),
  country: varchar('country', { length: 100 }).default('India').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  oneDefaultPerUser: uniqueIndex('addresses_one_default_per_user').on(table.userId).where(sql`${table.isDefault} = true`),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const insertAddressSchema = createInsertSchema(addresses);
export const selectAddressSchema = createSelectSchema(addresses);

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
