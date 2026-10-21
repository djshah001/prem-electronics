import { relations } from 'drizzle-orm';
import { index, jsonb, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const adminNotificationSeverityEnum = pgEnum('admin_notification_severity', ['info', 'success', 'warning', 'error']);

export const adminNotifications = pgTable('admin_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventKey: varchar('event_key', { length: 255 }).notNull(),
  type: varchar('type', { length: 60 }).notNull(),
  severity: adminNotificationSeverityEnum('severity').default('info').notNull(),
  title: varchar('title', { length: 160 }).notNull(),
  message: varchar('message', { length: 500 }).notNull(),
  entityType: varchar('entity_type', { length: 60 }),
  entityId: uuid('entity_id'),
  destination: varchar('destination', { length: 300 }),
  metadata: jsonb('metadata').$type<Record<string, string | number | boolean | null>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('admin_notifications_event_key_uidx').on(table.eventKey),
  index('admin_notifications_created_at_idx').on(table.createdAt, table.id),
  index('admin_notifications_type_idx').on(table.type),
]);

export const adminNotificationRecipients = pgTable('admin_notification_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  notificationId: uuid('notification_id').notNull().references(() => adminNotifications.id, { onDelete: 'cascade' }),
  adminUserId: uuid('admin_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('admin_notification_recipients_notification_admin_uidx').on(table.notificationId, table.adminUserId),
  index('admin_notification_recipients_admin_read_idx').on(table.adminUserId, table.readAt),
  index('admin_notification_recipients_admin_created_idx').on(table.adminUserId, table.createdAt),
]);

export const adminNotificationsRelations = relations(adminNotifications, ({ many }) => ({ recipients: many(adminNotificationRecipients) }));
export const adminNotificationRecipientsRelations = relations(adminNotificationRecipients, ({ one }) => ({
  notification: one(adminNotifications, { fields: [adminNotificationRecipients.notificationId], references: [adminNotifications.id] }),
  admin: one(users, { fields: [adminNotificationRecipients.adminUserId], references: [users.id] }),
}));

export type AdminNotification = typeof adminNotifications.$inferSelect;
