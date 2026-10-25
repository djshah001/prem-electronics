import crypto from 'crypto';
import { and, eq, gte, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  coupons,
  emailOutbox,
  orderItems,
  orders,
  paymentAttempts,
  paymentRefunds,
  orderStatusEvents,
  products,
  productVariants,
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
import { AppError, ForbiddenError, NotFoundError } from '../../core/errors/appError.js';
import logger from '../../core/logger/logger.js';
import { env } from '../../config/env.js';
import { emailMasterService } from '../communications/email.service.js';
import { invoiceMasterService } from '../invoiceMaster/invoice.service.js';
import { createAdminNotification } from '../notifications/notifications.service.js';

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
    const payload = entry.payload as Record<string, any>;
    const delivery = await emailMasterService.enqueueAndAttempt('order_confirmed', entry.recipient, {
      customerName: payload.customerName ?? 'Customer', orderNumber: payload.orderNumber ?? 'Order',
      orderTotal: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(payload.total ?? 0)),
    }, `legacy-order-confirmed:${entry.orderId ?? entry.id}`, { orderId: entry.orderId ?? undefined, priority: 20 });
    if (!delivery || !['smtp_accepted', 'unknown'].includes(delivery.status)) throw new Error(delivery?.lastError ?? 'Versioned email delivery remains queued for retry.');
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
      await db.transaction(async (tx) => {
        await tx.update(paymentAttempts).set({
          status: 'failed',
          failureReason: String(error?.message ?? error).slice(0, 500),
          updatedAt: new Date(),
        }).where(eq(paymentAttempts.providerOrderId, input.razorpay_order_id));
        await createAdminNotification(tx, {
          eventKey: `payment.failed:${existingOrder.id}:${input.razorpay_payment_id}`,
          type: 'payment_failed', severity: 'error', title: 'Payment failed',
          message: `Payment verification failed for order #${existingOrder.orderNumber}.`,
          entityType: 'order', entityId: existingOrder.id, destination: `/admin/orders/${existingOrder.id}`,
        });
      });
      if (existingOrder.userId) {
        const [user] = await db.select().from(users).where(eq(users.id, existingOrder.userId)).limit(1);
        if (user?.email) await emailMasterService.enqueue('payment_failed', user.email, { customerName: user.name, orderNumber: existingOrder.orderNumber }, `payment-failed:${existingOrder.id}:${input.razorpay_payment_id}`, { orderId: existingOrder.id, priority: 20 }).catch((queueError) => logger.error('Payment failure email could not be queued.', queueError));
      }
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
        if (item.variantId) {
          const reservedVariant = await tx.update(productVariants).set({
            stockQuantity: sql`${productVariants.stockQuantity} - ${item.quantity}`,
            reservedQuantity: sql`${productVariants.reservedQuantity} + ${item.quantity}`,
            updatedAt: new Date(),
          }).where(and(eq(productVariants.id, item.variantId), eq(productVariants.isActive, true), gte(productVariants.stockQuantity, item.quantity))).returning({ id: productVariants.id });
          if (reservedVariant.length !== 1) throw new AppError('Insufficient variant inventory to complete this payment.', 409);
        }
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
      invoiceNumber: order.invoiceNumber ?? `INV-${order.orderNumber}`,
      invoiceIssuedAt: order.invoiceIssuedAt ?? new Date(),
      updatedAt: new Date(),
    }).where(eq(orders.id, order.id)).returning();

    await tx.insert(orderStatusEvents).values({
      orderId: order.id,
      eventType: 'payment_captured',
      fromValue: order.paymentStatus,
      toValue: 'paid',
      metadata: { providerPaymentId: input.razorpay_payment_id },
    });

    const capturedAt = new Date();
    await tx.update(paymentAttempts).set({
      providerPaymentId: input.razorpay_payment_id,
      status: 'captured',
      capturedAt,
      finalizedAt: capturedAt,
      updatedAt: capturedAt,
    }).where(eq(paymentAttempts.providerOrderId, input.razorpay_order_id));

    await createAdminNotification(tx, {
      eventKey: `payment.confirmed:${order.id}`, type: 'payment_confirmed', severity: 'success',
      title: 'Payment confirmed', message: `Payment was confirmed for order #${order.orderNumber}.`,
      entityType: 'order', entityId: order.id, destination: `/admin/orders/${order.id}`,
      metadata: { amountMinor: order.amountMinor, currency: order.currency },
    });

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
      if (cart) {
        for (const item of items) {
          const identity = item.variantId
            ? eq(cartItems.variantId, item.variantId)
            : item.productId ? eq(cartItems.productId, item.productId) : undefined;
          if (!identity) continue;
          const [currentLine] = await tx.select().from(cartItems)
            .where(and(eq(cartItems.cartId, cart.id), identity)).for('update').limit(1);
          if (!currentLine) continue;
          // An exact unchanged snapshot is consumed. Additions made while payment was open remain;
          // a lower quantity is treated as an intentional edit and is left untouched.
          if (currentLine.quantity === item.quantity) {
            await tx.delete(cartItems).where(eq(cartItems.id, currentLine.id));
          } else if (currentLine.quantity > item.quantity) {
            await tx.update(cartItems).set({ quantity: currentLine.quantity - item.quantity, updatedAt: new Date() })
              .where(eq(cartItems.id, currentLine.id));
          }
        }
        await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
      }
    }

    let emailRequest: { recipient: string; variables: Record<string, unknown> } | undefined;
    if (order.userId) {
      const [user] = await tx.select().from(users).where(eq(users.id, order.userId)).limit(1);
      if (user?.email) {
        emailRequest = {
          recipient: user.email,
          variables: {
            orderNumber: order.orderNumber,
            customerName: user.name,
            orderTotal: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(order.total)),
          },
        };
      }
    }

    return { order: paidOrder, emailRequest, idempotent: false };
  });

  try {
    await invoiceMasterService.issueForOrder(result.order.id);
  } catch (error) {
    logger.error('Invoice issuance will be retried on customer download.', { orderId: result.order.id, error });
  }
  if (result.emailRequest) {
    void emailMasterService.enqueueAndAttempt('order_confirmed', result.emailRequest.recipient, result.emailRequest.variables, `order-confirmed:${result.order.id}`, { orderId: result.order.id, priority: 20 })
      .catch((error) => logger.error('Order confirmation email queued for retry.', { orderId: result.order.id, error }));
  }
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

        const [record] = await db.select({ order: orders, attempt: paymentAttempts }).from(paymentAttempts)
          .innerJoin(orders, eq(orders.id, paymentAttempts.orderId))
          .where(eq(paymentAttempts.providerPaymentId, paymentId))
          .limit(1);
        if (!record) {
          logger.warn('Order not found for refund.processed webhook', { paymentId, refundId: refund?.id });
          await db.update(webhookEvents).set({ status: 'ignored', processedAt: new Date() })
            .where(eq(webhookEvents.eventId, eventId));
          return { ignored: true };
        }

        const refundId = String(refund.id ?? '');
        const amountMinor = Number(refund.amount);
        if (!refundId || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
          throw new AppError('Webhook refund details are invalid.', 400);
        }
        const reconciliation = await db.transaction(async (tx) => {
          await tx.insert(paymentRefunds).values({
            orderId: record.order.id,
            paymentAttemptId: record.attempt.id,
            providerRefundId: refundId,
            amountMinor,
            currency: String(refund.currency ?? record.attempt.currency).toUpperCase(),
            status: 'processed',
            processedAt: refund.created_at ? new Date(Number(refund.created_at) * 1000) : new Date(),
          }).onConflictDoUpdate({
            target: paymentRefunds.providerRefundId,
            set: { status: 'processed', processedAt: new Date(), updatedAt: new Date() },
          });

          const [refundTotals] = await tx.select({
            total: sql<number>`coalesce(sum(${paymentRefunds.amountMinor}), 0)`,
          }).from(paymentRefunds).where(and(
            eq(paymentRefunds.paymentAttemptId, record.attempt.id),
            eq(paymentRefunds.status, 'processed')
          ));
          const totalRefundedMinor = Number(refundTotals.total);
          const fullyRefunded = totalRefundedMinor >= record.attempt.amountMinor;
          const refundStatus = fullyRefunded ? 'processed' as const : 'partial' as const;
          const [updatedOrder] = await tx.update(orders).set({
            refundStatus,
            ...(fullyRefunded ? { paymentStatus: 'refunded' as const, status: 'refunded' as const } : {}),
            updatedAt: new Date(),
          }).where(eq(orders.id, record.order.id)).returning();
          if (fullyRefunded) {
            await tx.update(paymentAttempts).set({ status: 'refunded', updatedAt: new Date() })
              .where(eq(paymentAttempts.id, record.attempt.id));
          }
          await tx.insert(orderStatusEvents).values({
            orderId: record.order.id,
            eventType: 'refund_changed',
            fromValue: record.order.refundStatus,
            toValue: refundStatus,
            metadata: { providerRefundId: refundId, amountMinor, totalRefundedMinor, fullyRefunded, source: 'webhook' },
          });
          const amountLabel = new Intl.NumberFormat('en-IN', { style: 'currency', currency: record.attempt.currency }).format(amountMinor / 100);
          await createAdminNotification(tx, {
            eventKey: `refund.external:${refundId}`, type: 'external_refund_confirmed', severity: 'warning',
            title: fullyRefunded ? 'External refund completed' : 'External partial refund recorded',
            message: `${amountLabel} was refunded externally for order #${record.order.orderNumber}.`,
            entityType: 'order', entityId: record.order.id, destination: `/admin/orders/${record.order.id}`,
            metadata: { amountMinor, currency: record.attempt.currency, fullyRefunded },
          });
          await tx.update(webhookEvents).set({ status: 'processed', processedAt: new Date() })
            .where(eq(webhookEvents.eventId, eventId));
          return { fullyRefunded, refundStatus, updatedOrder };
        });
        return { orderId: record.order.id, refundStatus: reconciliation.refundStatus, fullyRefunded: reconciliation.fullyRefunded, order: reconciliation.updatedOrder };
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
