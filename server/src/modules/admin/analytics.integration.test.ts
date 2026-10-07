import assert from 'node:assert/strict';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { orders, paymentAttempts, paymentRefunds } from '../../infrastructure/database/schema/index.js';
import { adminP2Service } from './admin.p2.service.js';

const istToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

test('analytics subtracts only processed refunds from captured collections', async () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const orderNumber = `TST-${suffix}`;
  const [order] = await db.insert(orders).values({
    orderNumber, status: 'confirmed', paymentStatus: 'paid', subtotal: '10.00', total: '10.00',
    amountMinor: 1000, currency: 'TST', razorpayOrderId: `order_${suffix}`, razorpayPaymentId: `pay_${suffix}`,
  }).returning();
  const [attempt] = await db.insert(paymentAttempts).values({
    orderId: order.id, providerOrderId: `order_${suffix}`, providerPaymentId: `pay_${suffix}`,
    amountMinor: 1000, currency: 'TST', status: 'captured', capturedAt: new Date(), finalizedAt: new Date(),
  }).returning();
  try {
    await db.insert(paymentRefunds).values([
      { orderId: order.id, paymentAttemptId: attempt.id, providerRefundId: `processed_${suffix}`, amountMinor: 200, merchandiseMinor: 200, taxMinor: 0, shippingMinor: 0, currency: 'TST', status: 'processed', processedAt: new Date() },
      { orderId: order.id, paymentAttemptId: attempt.id, providerRefundId: `pending_${suffix}`, amountMinor: 100, currency: 'TST', status: 'pending' },
    ]);
    const today = istToday();
    const result = await adminP2Service.getAnalytics({ preset: 'custom', start: today, end: today, timezone: 'Asia/Kolkata', currency: 'TST' });
    assert.equal(result.collections.grossCapturedMinor, 1000);
    assert.equal(result.collections.processedRefundMinor, 200);
    assert.equal(result.collections.netCollectionsMinor, 800);
    assert.equal(result.appliedRange.timezone, 'Asia/Kolkata');
    assert.equal(result.daily.length, 1);
  } finally {
    await db.delete(paymentRefunds).where(eq(paymentRefunds.orderId, order.id));
    await db.delete(paymentAttempts).where(eq(paymentAttempts.orderId, order.id));
    await db.delete(orders).where(eq(orders.id, order.id));
  }
});
