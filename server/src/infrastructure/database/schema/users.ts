import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { addresses } from './addresses.js';
import { orders } from './orders.js';
import { reviews } from './reviews.js';
import { carts } from './carts.js';
import { couponRedemptions } from './couponRedemptions.js';

export const userRoleEnum = pgEnum('user_role', ['customer', 'admin', 'superadmin']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('customer').notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  isBlocked: boolean('is_blocked').default(false).notNull(),
  avatarUrl: text('avatar_url'),
  phone: varchar('phone', { length: 20 }),
  otpToken: varchar('otp_token', { length: 64 }),
  otpExpiry: timestamp('otp_expiry', { withTimezone: true }),
  resetToken: varchar('reset_token', { length: 64 }),
  resetTokenExpiry: timestamp('reset_token_expiry', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  reviews: many(reviews),
  carts: many(carts),
  couponRedemptions: many(couponRedemptions),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
