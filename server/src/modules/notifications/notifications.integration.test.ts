import assert from 'node:assert/strict';
import test from 'node:test';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { adminNotifications, users } from '../../infrastructure/database/schema/index.js';
import { createAdminNotification, notificationsService } from './notifications.service.js';

test('admin notifications are transactional, idempotent, and keep per-admin read state', async () => {
  const suffix = crypto.randomUUID();
  const emails = [`notification-a-${suffix}@example.test`, `notification-b-${suffix}@example.test`];
  const eventKeys = [`test.notification:${suffix}:one`, `test.notification:${suffix}:two`, `test.notification:${suffix}:rollback`];
  const admins = await db.insert(users).values(emails.map((email, index) => ({
    name: `Notification Admin ${index + 1}`, email, passwordHash: 'not-used-in-integration-test',
    role: 'admin' as const, isVerified: true,
  }))).returning({ id: users.id });

  try {
    const first = { eventKey: eventKeys[0], type: 'new_order', title: 'Test order', message: 'A test order was placed.' };
    await createAdminNotification(db, first);
    await createAdminNotification(db, first);
    const stored = await db.select({ id: adminNotifications.id }).from(adminNotifications).where(eq(adminNotifications.eventKey, eventKeys[0]));
    assert.equal(stored.length, 1);

    assert.equal((await notificationsService.unreadCount(admins[0].id)).count, 1);
    assert.equal((await notificationsService.unreadCount(admins[1].id)).count, 1);
    const firstList = await notificationsService.list(admins[0].id, { page: 1, limit: 10, readState: 'all' });
    assert.equal(firstList.data.length, 1);
    await notificationsService.setRead(admins[0].id, firstList.data[0].id, true);
    assert.equal((await notificationsService.unreadCount(admins[0].id)).count, 0);
    assert.equal((await notificationsService.unreadCount(admins[1].id)).count, 1);

    await notificationsService.readAll(admins[0].id);
    await createAdminNotification(db, { eventKey: eventKeys[1], type: 'payment_confirmed', title: 'Later event', message: 'Created after the read-all cutoff.' });
    assert.equal((await notificationsService.unreadCount(admins[0].id)).count, 1);

    await assert.rejects(db.transaction(async (tx) => {
      await createAdminNotification(tx, { eventKey: eventKeys[2], type: 'new_order', title: 'Rolled back', message: 'Must not persist.' });
      throw new Error('force rollback');
    }));
    const rolledBack = await db.select().from(adminNotifications).where(eq(adminNotifications.eventKey, eventKeys[2]));
    assert.equal(rolledBack.length, 0);
  } finally {
    await db.delete(adminNotifications).where(inArray(adminNotifications.eventKey, eventKeys));
    await db.delete(users).where(inArray(users.email, emails));
  }
});
