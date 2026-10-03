import crypto from 'crypto';
import { and, eq, gte, inArray, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  coupons,
  emailOutbox,
  orderItems,
  orders,
  paymentAttempts,
  products,
  users,
  webhookEvents,
  carts,
  cartItems,
  couponRedemptions,
} from '../../infrastructure/database/schema/index.js';
import {
  razorpay,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../../infrastructure/payment/razorpay.js';
import { sendOrderConfirmationEmail } from '../../infrastructure/mail/mailer.js';
import { AppError, ForbiddenError, NotFoundError } from '../../core/errors/appError.js';
import logger from '../../core/logger/logger.js';
import { env } from '../../config/env.js';

type PaymentInput = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
};

type FinalizeOptions = {
  userId?: string;
  trustedWebhook?: boolean;
};

const isExplicitDevelopmentMock = (input: PaymentInput) =>
  env.NODE_ENV !== 'production' &&
  env.ALLOW_MOCK_PAYMENTS &&
  input.razorpay_order_id.startsWith('mock_order_') &&
  input.razorpay_payment_id.startsWith('mock_payment_') &&
  input.razorpay_signature === 'mock_signature';

const verifyProviderPayment = async (order: typeof orders.$inferSelect, input: PaymentInput) => {
  if (isExplicitDevelopmentMock(input)) return;

  if (!input.razorpay_signature || !verifyPaymentSignature(
    order.razorpayOrderId!,
    input.razorpay_payment_id,
    input.razorpay_signature
  )) {
    throw new AppError('Payment verification failed. Invalid signature.', 400);
  }

  let providerPayment: any;
  try {
    providerPayment = await razorpay.payments.fetch(input.razorpay_payment_id);
  } catch (error) {
    logger.error('Unable to reconcile payment with Razorpay.', error);
    throw new AppError('Unable to confirm the payment with Razorpay.', 502);
  }

  if (
    providerPayment.status !== 'captured' ||
    providerPayment.order_id !== order.razorpayOrderId ||
    Number(providerPayment.amount) !== order.amountMinor ||
    String(providerPayment.currency).toUpperCase() !== order.currency
  ) {
    throw new AppError('Provider payment details do not match this order.', 400);
  }
};

const deliverOrderEmail = async (outboxId: string) => {
  const [entry] = await db.update(emailOutbox).set({
    // Claim the row long enough to prevent concurrent workers from sending it twice.
    nextAttemptAt: new Date(Date.now() + 5 * 60 * 1000),
    updatedAt: new Date(),
  }).where(and(
    eq(emailOutbox.id, outboxId),
    or(eq(emailOutbox.status, 'pending'), eq(emailOutbox.status, 'failed')),
    lte(emailOutbox.nextAttemptAt, new Date()),
    lt(emailOutbox.attempts, 5)
  )).returning();
  if (!entry) return;

  try {
    await sendOrderConfirmationEmail(entry.recipient, entry.payload as any);
    await db.update(emailOutbox).set({
      status: 'sent',
      sentAt: new Date(),
      attempts: sql`${emailOutbox.attempts} + 1`,
      updatedAt: new Date(),
    }).where(eq(emailOutbox.id, entry.id));
  } catch (error: any) {
    await db.update(emailOutbox).set({
      status: 'failed',
      attempts: sql`${emailOutbox.attempts} + 1`,
      lastError: String(error?.message ?? error).slice(0, 500),
      nextAttemptAt: new Date(Date.now() + 5 * 60 * 1000),
      updatedAt: new Date(),
    }).where(eq(emailOutbox.id, entry.id));
    logger.error('Order confirmation email queued for retry.', { outboxId, error });
  }
};

const finalizePayment = async (input: PaymentInput, options: FinalizeOptions) => {
  const [existingOrder] = await db.select().from(orders)
    .where(eq(orders.razorpayOrderId, input.razorpay_order_id))
    .limit(1);

  if (!existingOrder) throw new NotFoundError('Order not found.');
  if (options.userId && existingOrder.userId !== options.userId) throw new ForbiddenError();

  if (existingOrder.paymentStatus === 'paid') {
    if (existingOrder.razorpayPaymentId !== input.razorpay_payment_id) {
      throw new AppError('This order was already paid using a different payment.', 409);
    }
    return { orderId: existingOrder.id, orderNumber: existingOrder.orderNumber, idempotent: true };
  }

  if (!options.trustedWebhook) {
    try {
      await verifyProviderPayment(existingOrder, input);
    } catch (error: any) {
      await db.update(paymentAttempts).set({
        status: 'failed',
        failureReason: String(error?.message ?? error).slice(0, 500),
        updatedAt: new Date(),
      }).where(eq(paymentAttempts.providerOrderId, input.razorpay_order_id));
      throw error;
    }
  }

  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders)
      .where(eq(orders.id, existingOrder.id))
      .for('update')
      .limit(1);

    if (!order) throw new NotFoundError('Order not found.');
    if (order.paymentStatus === 'paid') {
      if (order.razorpayPaymentId !== input.razorpay_payment_id) {
        throw new AppError('This order was already paid using a different payment.', 409);
      }
      return { order, outboxId: undefined as string | undefined, idempotent: true };
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    // Legacy or previously released orders do not own reserved stock. Reacquire it atomically.
    if (!order.inventoryReservedAt || order.inventoryReleasedAt) {
      for (const item of items) {
        if (!item.productId) throw new AppError('A purchased product is no longer available.', 409);
        const reserved = await tx.update(products).set({
          stock: sql`${products.stock} - ${item.quantity}`,
          updatedAt: new Date(),
        }).where(and(
          eq(products.id, item.productId),
          eq(products.isActive, true),
          gte(products.stock, item.quantity)
        )).returning({ id: products.id });
        if (reserved.length !== 1) throw new AppError('Insufficient inventory to complete this payment.', 409);
      }
    }

    const [paidOrder] = await tx.update(orders).set({
      paymentStatus: 'paid',
      status: 'confirmed',
      razorpayPaymentId: input.razorpay_payment_id,
      razorpaySignature: input.razorpay_signature ?? null,
      inventoryReleasedAt: null,
      updatedAt: new Date(),
    }).where(eq(orders.id, order.id)).returning();

    await tx.update(paymentAttempts).set({
      providerPaymentId: input.razorpay_payment_id,
      status: 'captured',
      finalizedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(paymentAttempts.providerOrderId, input.razorpay_order_id));

    if (order.couponId) {
      await tx.update(coupons).set({
        usedCount: sql`${coupons.usedCount} + 1`,
        updatedAt: new Date(),
      }).where(eq(coupons.id, order.couponId));
      if (order.userId) {
        await tx.insert(couponRedemptions).values({ couponId: order.couponId, userId: order.userId, orderId: order.id }).onConflictDoNothing();
      }
    }

    if (order.userId) {
      const [cart] = await tx.select({ id: carts.id }).from(carts).where(eq(carts.userId, order.userId)).limit(1);
      const purchasedProductIds = items.flatMap((item) => item.productId ? [item.productId] : []);
      if (cart && purchasedProductIds.length > 0) {
        await tx.delete(cartItems).where(and(eq(cartItems.cartId, cart.id), inArray(cartItems.productId, purchasedProductIds)));
        await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
      }
    }

    let outboxId: string | undefined;
    if (order.userId) {
      const [user] = await tx.select().from(users).where(eq(users.id, order.userId)).limit(1);
      if (user) {
        const [outbox] = await tx.insert(emailOutbox).values({
          orderId: order.id,
          kind: 'order_confirmation',
          recipient: user.email,
          payload: {
            orderNumber: order.orderNumber,
            customerName: user.name,
            items: items.map((item) => ({
              title: item.productTitle ?? 'Product',
              quantity: item.quantity,
              price: Number(item.priceAtPurchase),
            })),
            subtotal: Number(order.subtotal),
            discount: Number(order.discount ?? 0),
            shipping: Number(order.shipping ?? 0),
            tax: Number(order.tax ?? 0),
            total: Number(order.total),
            shippingAddress: order.shippingAddress,
          },
        }).returning({ id: emailOutbox.id });
        outboxId = outbox.id;
      }
    }

    return { order: paidOrder, outboxId, idempotent: false };
  });

  if (result.outboxId) void deliverOrderEmail(result.outboxId);
  return {
    orderId: result.order.id,
    orderNumber: result.order.orderNumber,
    idempotent: result.idempotent,
  };
};

export const paymentsService = {
  async verifyAndComplete(userId: string, input: Required<PaymentInput>) {
    return finalizePayment(input, { userId });
  },

  async handleWebhook(rawBody: Buffer, signature: string, suppliedEventId?: string) {
    const body = rawBody.toString('utf8');
    if (!verifyWebhookSignature(body, signature)) {
      throw new AppError('Invalid webhook signature.', 400);
    }

    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const event = JSON.parse(body) as any;
    const eventId = suppliedEventId || payloadHash;

    const inserted = await db.insert(webhookEvents).values({
      eventId,
      eventType: String(event.event ?? 'unknown'),
      payloadHash,
    }).onConflictDoNothing({ target: webhookEvents.eventId }).returning({ id: webhookEvents.id });

    if (inserted.length === 0) {
      const [existingEvent] = await db.select().from(webhookEvents)
        .where(eq(webhookEvents.eventId, eventId))
        .limit(1);
      if (!existingEvent || existingEvent.status !== 'failed') return { duplicate: true };
      await db.update(webhookEvents).set({
        status: 'processing',
        error: null,
        processedAt: null,
      }).where(eq(webhookEvents.id, existingEvent.id));
    }

    try {
      if (event.event === 'refund.processed') {
        const refund = event.payload?.refund?.entity;
        const paymentId = refund?.payment_id;
        if (!paymentId) throw new AppError('Webhook is missing refund payment details.', 400);

        const [order] = await db.select().from(orders)
          .where(eq(orders.razorpayPaymentId, paymentId))
          .limit(1);
        if (!order) {
          logger.warn('Order not found for refund.processed webhook', { paymentId, refundId: refund?.id });
          await db.update(webhookEvents).set({ status: 'ignored', processedAt: new Date() })
            .where(eq(webhookEvents.eventId, eventId));
          return { ignored: true };
        }

        const [updatedOrder] = await db.update(orders).set({
          refundStatus: 'processed',
          paymentStatus: 'refunded',
          status: 'refunded',
          updatedAt: new Date(),
        }).where(eq(orders.id, order.id)).returning();

        await db.update(webhookEvents).set({ status: 'processed', processedAt: new Date() })
          .where(eq(webhookEvents.eventId, eventId));
        return { orderId: order.id, refundStatus: 'processed', order: updatedOrder };
      }

      if (event.event !== 'payment.captured') {
        await db.update(webhookEvents).set({ status: 'ignored', processedAt: new Date() })
          .where(eq(webhookEvents.eventId, eventId));
        return { ignored: true };
      }

      const payment = event.payload?.payment?.entity;
      if (!payment?.order_id || !payment?.id) throw new AppError('Webhook is missing payment details.', 400);

      const [order] = await db.select().from(orders)
        .where(eq(orders.razorpayOrderId, payment.order_id))
        .limit(1);
      if (!order) throw new NotFoundError('Webhook order not found.');
      if (
        payment.status !== 'captured' ||
        Number(payment.amount) !== order.amountMinor ||
        String(payment.currency).toUpperCase() !== order.currency
      ) {
        throw new AppError('Webhook payment details do not match the order.', 400);
      }

      const result = await finalizePayment({
        razorpay_order_id: payment.order_id,
        razorpay_payment_id: payment.id,
      }, { trustedWebhook: true });

      await db.update(webhookEvents).set({ status: 'processed', processedAt: new Date() })
        .where(eq(webhookEvents.eventId, eventId));
      return result;
    } catch (error: any) {
      await db.update(webhookEvents).set({
        status: 'failed',
        error: String(error?.message ?? error).slice(0, 500),
        processedAt: new Date(),
      }).where(eq(webhookEvents.eventId, eventId));
      throw error;
    }
  },

  async processEmailOutbox(limit = 10) {
    const entries = await db.select({ id: emailOutbox.id }).from(emailOutbox)
      .where(and(
        or(eq(emailOutbox.status, 'pending'), eq(emailOutbox.status, 'failed')),
        lte(emailOutbox.nextAttemptAt, new Date()),
        lt(emailOutbox.attempts, 5)
      ))
      .limit(limit);
    for (const entry of entries) await deliverOrderEmail(entry.id);
    return entries.length;
  },
};
