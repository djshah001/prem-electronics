import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.js';

export const otpPurposeEnum = pgEnum('otp_purpose', [
  'customer_login',
  'admin_login',
  'phone_change_current',
  'phone_change_new',
]);

export const otpProviderEnum = pgEnum('otp_provider', ['msg91_widget', 'fake']);

export const otpChallengeStatusEnum = pgEnum('otp_challenge_status', [
  'sending',
  'sent',
  'verifying',
  'verified',
  'consumed',
  'expired',
  'failed',
  'superseded',
]);

export const otpChallenges = pgTable('otp_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  canonicalPhone: varchar('canonical_phone', { length: 20 }).notNull(),
  purpose: otpPurposeEnum('purpose').notNull(),
  boundUserId: uuid('bound_user_id').references(() => users.id, { onDelete: 'cascade' }),
  bindingHash: varchar('binding_hash', { length: 64 }).notNull(),
  provider: otpProviderEnum('provider').notNull(),
  providerRequestRef: text('provider_request_ref'),
  generation: integer('generation').default(1).notNull(),
  status: otpChallengeStatusEnum('status').default('sending').notNull(),
  attemptCount: integer('attempt_count').default(0).notNull(),
  resendCount: integer('resend_count').default(0).notNull(),
  ipHash: varchar('ip_hash', { length: 64 }).notNull(),
  deviceHash: varchar('device_hash', { length: 64 }).notNull(),
  safeErrorCategory: varchar('safe_error_category', { length: 40 }),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  resendAvailableAt: timestamp('resend_available_at', { withTimezone: true }).notNull(),
  processingLeaseUntil: timestamp('processing_lease_until', { withTimezone: true }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  continuationHash: varchar('continuation_hash', { length: 64 }),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('otp_challenges_phone_purpose_idx').on(table.canonicalPhone, table.purpose, table.createdAt),
  index('otp_challenges_ip_created_idx').on(table.ipHash, table.createdAt),
  index('otp_challenges_status_expiry_idx').on(table.status, table.expiresAt),
  index('otp_challenges_user_purpose_idx').on(table.boundUserId, table.purpose),
  uniqueIndex('otp_challenges_continuation_uidx').on(table.continuationHash),
]);

export const otpChallengesRelations = relations(otpChallenges, ({ one }) => ({
  boundUser: one(users, { fields: [otpChallenges.boundUserId], references: [users.id] }),
}));

export type OtpChallenge = typeof otpChallenges.$inferSelect;

export const authIdentityAuditEvents = pgTable('auth_identity_audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(),
  previousPhoneHash: varchar('previous_phone_hash', { length: 64 }),
  nextPhoneHash: varchar('next_phone_hash', { length: 64 }),
  actor: varchar('actor', { length: 100 }).notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('auth_identity_audit_user_idx').on(table.userId, table.createdAt)]);
