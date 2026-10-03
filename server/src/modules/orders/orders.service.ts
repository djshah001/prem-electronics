import { ordersRepository } from './orders.repository.js';
import { cartService } from '../cart/cart.service.js';
import { usersRepository } from '../users/users.repository.js';
import { couponsRepository } from '../coupons/coupons.repository.js';
import { razorpay } from '../../infrastructure/payment/razorpay.js';
import { env } from '../../config/env.js';
import logger from '../../core/logger/logger.js';
import crypto from 'crypto';
import { NotFoundError, ForbiddenError, AppError } from '../../core/errors/appError.js';
import { buildPaginationMeta } from '../../core/utils/responseHandler.js';
import type { CreateOrderInput, UpdateOrderStatusInput, OrderQuery } from './orders.schema.js';

const ADMIN_TRANSITIONS: Record<string, Array<'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'>> = {
  processing: ['confirmed'],
  shipped: ['processing'],
  delivered: ['shipped'],
  cancelled: ['pending', 'confirmed', 'processing'],
};

export const ordersService = {
  async createOrder(userId: string, input: CreateOrderInput) {
    await ordersRepository.releaseExpiredReservations();
    // 1. Validate cart server-side
    const cart = await cartService.validateCart({
      items: input.items,
      couponCode: input.couponCode,
    }, userId);

    // 2. Resolve shipping address
    let shippingAddress = input.shippingAddress;
    if (!shippingAddress && input.shippingAddressId) {
      const addr = await usersRepository.getAddressById(input.shippingAddressId, userId);
      if (!addr) throw new NotFoundError('Shipping address not found.');
      shippingAddress = {
        fullName: addr.fullName,
        phone: addr.phone,
        street: addr.street,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        country: addr.country,
      };
    }

    if (!shippingAddress) throw new AppError('Shipping address is required.', 400);

    // 3. Create Razorpay order (amount in paise)
    const amountInPaise = Math.round(cart.total * 100);
    const orderNumber = `PE-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const mockPaymentsEnabled = env.NODE_ENV !== 'production' && env.ALLOW_MOCK_PAYMENTS;
    const credentialsLookPlaceholder = /example|your|x{4,}/i.test(env.RAZORPAY_KEY_ID);
    let razorpayOrderId: string;

    if (!mockPaymentsEnabled || !credentialsLookPlaceholder) {
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderNumber,
        });
        razorpayOrderId = razorpayOrder.id;
      } catch (err: any) {
        logger.error(`Razorpay order creation failed: ${err?.error?.description || err?.message || err}`);
        throw new AppError('Payment gateway communication error. Please try again.', 502);
      }
    } else {
      razorpayOrderId = `mock_order_${crypto.randomUUID()}`;
      logger.warn('[DEV PAYMENT MODE] Explicit mock payments are enabled.');
    }

    const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    let order;
    try {
      order = await ordersRepository.createWithInventoryReservation(
        {
          orderNumber,
          userId,
          subtotal: String(cart.subtotal),
          discount: String(cart.discount),
          tax: String(cart.tax),
          shipping: String(cart.shipping),
          total: String(cart.total),
          amountMinor: amountInPaise,
          currency: 'INR',
          couponId: cart.coupon?.id,
          couponCode: cart.coupon?.code,
          razorpayOrderId,
          shippingAddress,
          notes: input.notes,
        },
        cart.items.map((item) => ({
          productId: item.productId,
          productTitle: item.title,
          quantity: item.quantity,
          priceAtPurchase: String(item.unitPrice),
          variantSnapshot: item.variantSnapshot,
        })),
        reservationExpiresAt
      );
    } catch (error: any) {
      if (String(error?.message).startsWith('INVENTORY_RESERVATION_FAILED:')) {
        throw new AppError('One or more products are no longer available in the requested quantity.', 409);
      }
      throw error;
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      mockPayment: razorpayOrderId.startsWith('mock_order_'),
      reservationExpiresAt,
      cart,
    };
  },

  async getMyOrders(userId: string, query: OrderQuery) {
    const { data, total } = await ordersRepository.findByUserId(userId, query);
    const meta = buildPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  },

  async getMyOrderById(userId: string, orderId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    if (order.userId !== userId) throw new ForbiddenError();
    const items = await ordersRepository.getItemsWithProduct(orderId);
    return { ...order, items };
  },

  async getInvoice(orderId: string, userId?: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    if (userId && order.userId !== userId) throw new ForbiddenError();
    const items = await ordersRepository.getItemsWithProduct(orderId);

    return {
      merchant: {
        name: env.MERCHANT_NAME,
        gstin: env.MERCHANT_GSTIN,
        address: env.MERCHANT_ADDRESS,
        phone: env.MERCHANT_PHONE,
        email: env.MERCHANT_EMAIL,
      },
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        razorpayPaymentId: order.razorpayPaymentId,
        shippingAddress: order.shippingAddress,
        notes: order.notes,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount ?? 0),
        couponCode: order.couponCode,
        shipping: Number(order.shipping ?? 0),
        tax: Number(order.tax ?? 0),
        total: Number(order.total),
      },
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productTitle: item.productTitle,
        productSlug: item.productSlug,
        quantity: item.quantity,
        priceAtPurchase: Number(item.priceAtPurchase),
        lineTotal: Number(item.priceAtPurchase) * item.quantity,
        variantSnapshot: item.variantSnapshot,
      })),
    };
  },

  async getAllOrders(query: OrderQuery) {
    const { data, total } = await ordersRepository.findAll(query);
    const meta = buildPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  },

  async updateStatus(orderId: string, input: UpdateOrderStatusInput) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    const allowedFrom = ADMIN_TRANSITIONS[input.status] ?? [];
    if (!allowedFrom.includes(order.status)) {
      throw new AppError(`Order cannot move from ${order.status} to ${input.status}.`, 409);
    }
    const updated = await ordersRepository.transitionStatus(orderId, input.status, allowedFrom);
    if (!updated) throw new AppError('Order status changed in another request. Refresh and try again.', 409);
    return updated;
  },

  async cancelMyOrder(userId: string, orderId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    if (order.userId !== userId) throw new ForbiddenError();
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new AppError('This order can no longer be cancelled online.', 409);
    }
    const updated = await ordersRepository.transitionStatus(orderId, 'cancelled', ['pending', 'confirmed']);
    if (!updated) throw new AppError('Order status changed in another request. Refresh and try again.', 409);
    return updated;
  },

  async requestReturn(userId: string, orderId: string, reason: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    if (order.userId !== userId) throw new ForbiddenError();
    if (order.status !== 'delivered') throw new AppError('Only delivered orders can be returned.', 409);
    if (order.returnStatus !== 'none') throw new AppError('A return request has already been submitted for this order.', 409);
    const updated = await ordersRepository.requestReturn(orderId, reason);
    if (!updated) throw new AppError('Could not submit return request. Please try again.', 409);
    return updated;
  },

  async updateReturnStatus(orderId: string, returnStatus: 'approved' | 'rejected' | 'completed') {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    const updated = await ordersRepository.updateReturnStatus(orderId, returnStatus);
    if (!updated) throw new AppError('Could not update return status.', 409);
    return updated;
  },

  async processRefund(orderId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    if (order.refundStatus === 'processed') throw new AppError('Refund has already been processed for this order.', 409);
    const updated = await ordersRepository.processRefund(orderId);
    if (!updated) throw new NotFoundError('Order not found.');
    return updated;
  },

  async getOrdersAdmin(query: { page: number; limit: number; search?: string; sortBy?: string; sortOrder?: string }) {
    const { data, total } = await ordersRepository.findAllAdmin(query.page, query.limit, query.search, query.sortBy, query.sortOrder as 'asc' | 'desc');
    const meta = buildPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  },

  async bulkDelete(ids: string[]) {
    return ordersRepository.bulkDelete(ids);
  },
};
