import { and, desc, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { adminNotificationRecipients, adminNotifications, users } from '../../infrastructure/database/schema/index.js';
import { NotFoundError } from '../../core/errors/appError.js';
import { buildPaginationMeta } from '../../core/utils/responseHandler.js';
import type { NotificationListQuery } from './notifications.schema.js';

type NotificationInput = {
  eventKey: string;
  type: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  destination?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

/** Domain services call this with their transaction so the event and alert commit together. */
export const createAdminNotification = async (executor: any, input: NotificationInput) => {
  const [notification] = await executor.insert(adminNotifications).values(input)
    .onConflictDoNothing({ target: adminNotifications.eventKey }).returning();
  if (!notification) return undefined;

  const recipients = await executor.select({ id: users.id }).from(users).where(and(
    or(eq(users.role, 'admin'), eq(users.role, 'superadmin')),
    eq(users.isVerified, true),
    eq(users.isBlocked, false),
  ));
  if (recipients.length) {
    await executor.insert(adminNotificationRecipients).values(recipients.map((admin: { id: string }) => ({
      notificationId: notification.id,
      adminUserId: admin.id,
    }))).onConflictDoNothing();
  }
  return notification;
};

export const notificationsService = {
  async list(adminUserId: string, query: NotificationListQuery) {
    const conditions = [eq(adminNotificationRecipients.adminUserId, adminUserId)];
    if (query.type) conditions.push(eq(adminNotifications.type, query.type));
    if (query.severity) conditions.push(eq(adminNotifications.severity, query.severity));
    if (query.readState === 'read') conditions.push(isNotNull(adminNotificationRecipients.readAt));
    if (query.readState === 'unread') conditions.push(isNull(adminNotificationRecipients.readAt));
    const where = and(...conditions);
    const offset = (query.page - 1) * query.limit;
    const [data, count] = await Promise.all([
      db.select({
        id: adminNotifications.id, type: adminNotifications.type, severity: adminNotifications.severity,
        title: adminNotifications.title, message: adminNotifications.message,
        entityType: adminNotifications.entityType, entityId: adminNotifications.entityId,
        destination: adminNotifications.destination, metadata: adminNotifications.metadata,
        createdAt: adminNotifications.createdAt, readAt: adminNotificationRecipients.readAt,
      }).from(adminNotificationRecipients)
        .innerJoin(adminNotifications, eq(adminNotifications.id, adminNotificationRecipients.notificationId))
        .where(where).orderBy(desc(adminNotifications.createdAt), desc(adminNotifications.id))
        .limit(query.limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(adminNotificationRecipients)
        .innerJoin(adminNotifications, eq(adminNotifications.id, adminNotificationRecipients.notificationId)).where(where),
    ]);
    return { data, meta: buildPaginationMeta(query.page, query.limit, Number(count[0]?.count ?? 0)) };
  },

  async unreadCount(adminUserId: string) {
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(adminNotificationRecipients)
      .where(and(eq(adminNotificationRecipients.adminUserId, adminUserId), isNull(adminNotificationRecipients.readAt)));
    return { count: Number(row?.count ?? 0) };
  },

  async setRead(adminUserId: string, notificationId: string, read: boolean) {
    const [row] = await db.update(adminNotificationRecipients).set({ readAt: read ? new Date() : null })
      .where(and(eq(adminNotificationRecipients.adminUserId, adminUserId), eq(adminNotificationRecipients.notificationId, notificationId)))
      .returning({ notificationId: adminNotificationRecipients.notificationId, readAt: adminNotificationRecipients.readAt });
    if (!row) throw new NotFoundError('Notification not found.');
    return row;
  },

  async readAll(adminUserId: string) {
    const cutoff = new Date();
    await db.update(adminNotificationRecipients).set({ readAt: cutoff }).where(and(
      eq(adminNotificationRecipients.adminUserId, adminUserId),
      isNull(adminNotificationRecipients.readAt),
      sql`${adminNotificationRecipients.notificationId} in (select ${adminNotifications.id} from ${adminNotifications} where ${adminNotifications.createdAt} <= ${cutoff})`,
    ));
    return { cutoff: cutoff.toISOString() };
  },
};
