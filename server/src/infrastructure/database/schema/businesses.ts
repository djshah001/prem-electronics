import { relations, sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users.js';

export type BusinessAddress = {
  building?: string;
  street?: string;
  locality?: string;
  city?: string;
  district?: string;
  state: string;
  stateCode: string;
  pincode?: string;
  country: string;
  source: 'provider' | 'customer';
};

export const gstVerifications = pgTable('gst_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gstin: varchar('gstin', { length: 15 }).notNull(),
  provider: varchar('provider', { length: 30 }).notNull(),
  registrationStatus: varchar('registration_status', { length: 40 }).notNull(),
  legalName: varchar('legal_name', { length: 255 }).notNull(),
  tradeName: varchar('trade_name', { length: 255 }),
  taxpayerType: varchar('taxpayer_type', { length: 100 }),
  stateCode: varchar('state_code', { length: 2 }).notNull(),
  stateName: varchar('state_name', { length: 100 }).notNull(),
  principalAddress: jsonb('principal_address').$type<BusinessAddress>(),
  additionalAddresses: jsonb('additional_addresses').$type<BusinessAddress[]>().default([]).notNull(),
  providerPayload: jsonb('provider_payload').$type<Record<string, unknown>>(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  ownerGstinIdx: index('gst_verifications_owner_gstin_idx').on(table.userId, table.gstin),
}));

export const businessProfiles = pgTable('business_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  verificationId: uuid('verification_id').notNull().references(() => gstVerifications.id, { onDelete: 'restrict' }),
  nickname: varchar('nickname', { length: 100 }),
  gstin: varchar('gstin', { length: 15 }).notNull(),
  legalName: varchar('legal_name', { length: 255 }).notNull(),
  tradeName: varchar('trade_name', { length: 255 }),
  taxpayerType: varchar('taxpayer_type', { length: 100 }),
  registrationStatus: varchar('registration_status', { length: 40 }).notNull(),
  registrationStateCode: varchar('registration_state_code', { length: 2 }).notNull(),
  registrationStateName: varchar('registration_state_name', { length: 100 }).notNull(),
  registeredAddress: jsonb('registered_address').$type<BusinessAddress>(),
  billingAddress: jsonb('billing_address').$type<BusinessAddress>().notNull(),
  contactPerson: varchar('contact_person', { length: 100 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  isDefault: boolean('is_default').default(false).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  version: integer('version').default(1).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  ownerGstinUnique: uniqueIndex('business_profiles_owner_gstin_unique').on(table.userId, table.gstin),
  oneDefaultPerUser: uniqueIndex('business_profiles_one_default_per_user').on(table.userId).where(sql`${table.isDefault} = true AND ${table.isArchived} = false`),
  ownerActiveIdx: index('business_profiles_owner_active_idx').on(table.userId, table.isArchived),
}));

export const gstVerificationsRelations = relations(gstVerifications, ({ one, many }) => ({
  user: one(users, { fields: [gstVerifications.userId], references: [users.id] }),
  profiles: many(businessProfiles),
}));

export const businessProfilesRelations = relations(businessProfiles, ({ one }) => ({
  user: one(users, { fields: [businessProfiles.userId], references: [users.id] }),
  verification: one(gstVerifications, { fields: [businessProfiles.verificationId], references: [gstVerifications.id] }),
}));

export const insertBusinessProfileSchema = createInsertSchema(businessProfiles);
export const selectBusinessProfileSchema = createSelectSchema(businessProfiles);
export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type NewBusinessProfile = typeof businessProfiles.$inferInsert;
