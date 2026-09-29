import { ordersRepository } from './orders.repository';
import { cartService } from '../cart/cart.service';
import { usersRepository } from '../users/users.repository';
import { couponsRepository } from '../coupons/coupons.repository';
import { razorpay } from '../../infrastructure/payment/razorpay';
import { env } from '../../config/env';
import logger from '../../core/logger/logger';
import { NotFoundError, ForbiddenError, AppError } from '../../core/errors/appError';
import { buildPaginationMeta } from '../../core/utils/responseHandler';
import type { CreateOrderInput, UpdateOrderStatusInput, OrderQuery } from './orders.schema';

export const ordersService = {
  async createOrder(userId: string, input: CreateOrderInput) {
    // 1. Validate cart server-side
    const cart = await cartService.validateCart({
      items: input.items,
      couponCode: input.couponCode,
    });

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
    const orderNumber = await ordersRepository.generateOrderNumber();

    let razorpayOrderId = `order_${Date.now()}`;
    const hasLiveKeys = env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_ID !== 'rzp_test_example';

    if (hasLiveKeys) {
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: orderNumber,
        });
        razorpayOrderId = razorpayOrder.id;
      } catch (err: any) {
        logger.error(`Razorpay order creation failed: ${err?.error?.description || err?.message || err}`);
        if (env.NODE_ENV === 'production') {
          throw new AppError('Payment gateway communication error. Please try again.', 502);
        }
        logger.info(`[DEV PAYMENT FALLBACK] Using mock razorpayOrderId: ${razorpayOrderId}`);
      }
    } else {
      logger.info(`[DEV PAYMENT MODE] Using mock razorpayOrderId: ${razorpayOrderId}`);
    }

    // 4. Persist order in DB
    const order = await ordersRepository.create({
      orderNumber,
      userId,
      subtotal: String(cart.subtotal),
      discount: String(cart.discount),
      tax: String(cart.tax),
      shipping: String(cart.shipping),
      total: String(cart.total),
      couponId: cart.coupon?.id,
      couponCode: cart.coupon?.code,
      razorpayOrderId,
      shippingAddress,
      notes: input.notes,
    });

    // 5. Persist order items
    await ordersRepository.createItems(
      cart.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: String(item.unitPrice),
        variantSnapshot: item.variantSnapshot,
      }))
    );

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
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
    const items = await ordersRepository.getItems(orderId);
    return { ...order, items };
  },

  async getAllOrders(query: OrderQuery) {
    const { data, total } = await ordersRepository.findAll(query);
    const meta = buildPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  },

  async updateStatus(orderId: string, input: UpdateOrderStatusInput) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    return ordersRepository.updateStatus(orderId, input.status);
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
