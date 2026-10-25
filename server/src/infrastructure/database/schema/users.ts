import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
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
  email: varchar('email', { length: 255 }).unique(),
  // Retained only as rollback data during the OTP cutover. No route accepts it.
  passwordHash: varchar('password_hash', { length: 255 }),
  role: userRoleEnum('role').default('customer').notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  isBlocked: boolean('is_blocked').default(false).notNull(),
  avatarUrl: text('avatar_url'),
  // `phone` remains an untrusted contact field. Authentication uses authPhoneE164 only.
  phone: varchar('phone', { length: 20 }),
  authPhoneE164: varchar('auth_phone_e164', { length: 20 }),
  phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  otpToken: varchar('otp_token', { length: 64 }),
  otpExpiry: timestamp('otp_expiry', { withTimezone: true }),
  resetToken: varchar('reset_token', { length: 64 }),
  resetTokenExpiry: timestamp('reset_token_expiry', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_auth_phone_e164_unique').on(table.authPhoneE164),
]);

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
