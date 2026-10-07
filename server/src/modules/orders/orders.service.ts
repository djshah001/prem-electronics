import { ordersRepository } from './orders.repository.js';
import { cartService } from '../cart/cart.service.js';
import { usersRepository } from '../users/users.repository.js';
import { couponsRepository } from '../coupons/coupons.repository.js';
import { razorpay } from '../../infrastructure/payment/razorpay.js';
import { env } from '../../config/env.js';
import { paymentsService } from '../payments/payments.service.js';
import logger from '../../core/logger/logger.js';
import crypto from 'crypto';
import { NotFoundError, ForbiddenError, AppError } from '../../core/errors/appError.js';
import { buildPaginationMeta } from '../../core/utils/responseHandler.js';
import type { CreateOrderInput, UpdateOrderStatusInput, OrderQuery } from './orders.schema.js';
import { businessesRepository } from '../businesses/businesses.repository.js';
import { indiaStateCode } from '../pricing/stateCodes.js';
import { isValidGstin } from '../../infrastructure/gst/gstin.js';
import { emailMasterService } from '../communications/email.service.js';
import type { EmailEventKey } from '../communications/emailCatalog.js';

const ADMIN_TRANSITIONS: Record<string, Array<'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'>> = {
  processing: ['confirmed'],
  shipped: ['processing'],
  delivered: ['shipped'],
  cancelled: ['pending', 'confirmed', 'processing'],
};

const queueOrderCommunication = async (order: { id: string; userId: string | null; orderNumber: string }, eventKey: EmailEventKey, variables: Record<string, unknown> = {}) => {
  if (!order.userId) return;
  const user = await usersRepository.findById(order.userId);
  if (!user) return;
  try {
    await emailMasterService.enqueue(eventKey, user.email, { customerName: user.name, orderNumber: order.orderNumber, ...variables }, `${eventKey}:${order.id}:${String(variables.returnStatus ?? 'once')}`, { orderId: order.id });
  } catch (error) {
    logger.error('Order communication could not be queued.', { orderId: order.id, eventKey, error });
  }
};

export const ordersService = {
  async createOrder(userId: string, input: CreateOrderInput) {
    await ordersRepository.releaseExpiredReservations();
    // 1. Resolve shipping address. It determines place of supply for the supported ordinary-goods flow.
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

    if (shippingAddress.country.trim().toLowerCase() !== 'india') {
      throw new AppError('Only ordinary domestic India goods movement is currently supported. Export tax handling is not configured.', 400);
    }
    const placeOfSupplyStateCode = indiaStateCode(shippingAddress.state);
    if (!placeOfSupplyStateCode) throw new AppError('A recognized Indian shipping state is required to determine place of supply.', 400);

    let businessProfile;
    let buyerBusinessSnapshot;
    if (input.purchaseType === 'company') {
      if (!env.SUPPLIER_STATE_CODE) throw new AppError('Company checkout is unavailable until SUPPLIER_STATE_CODE is configured.', 503);
      if (!env.MERCHANT_GSTIN || !isValidGstin(env.MERCHANT_GSTIN) || env.MERCHANT_GSTIN.slice(0, 2) !== env.SUPPLIER_STATE_CODE) {
        throw new AppError('Company checkout is unavailable until a valid merchant GSTIN matching SUPPLIER_STATE_CODE is configured.', 503);
      }
      if (!env.MERCHANT_ADDRESS) throw new AppError('Company checkout is unavailable until the merchant invoice address is configured.', 503);
      businessProfile = await businessesRepository.findById(input.businessProfileId!, userId);
      if (!businessProfile) throw new NotFoundError('Business profile not found for this account.');
      const verification = await businessesRepository.findVerificationById(businessProfile.verificationId, userId);
      if (!verification || verification.expiresAt <= new Date()) throw new AppError('GST verification is stale. Reverify this business before checkout.', 409);
      if (verification.registrationStatus !== 'active' || businessProfile.registrationStatus !== 'active') {
        throw new AppError('The selected GST registration is not active.', 409);
      }
      buyerBusinessSnapshot = {
        profileId: businessProfile.id, verificationId: verification.id, gstin: verification.gstin,
        legalName: verification.legalName, tradeName: verification.tradeName, taxpayerType: verification.taxpayerType,
        registrationStatus: verification.registrationStatus, registrationStateCode: verification.stateCode,
        registrationStateName: verification.stateName, registeredAddress: verification.principalAddress,
        billingAddress: businessProfile.billingAddress, contactPerson: businessProfile.contactPerson,
        contactPhone: businessProfile.contactPhone, contactEmail: businessProfile.contactEmail,
        verifiedAt: verification.checkedAt.toISOString(), profileVersion: businessProfile.version,
        authorizedRepresentative: true as const, purchaseOrderReference: input.purchaseOrderReference,
      };
    }

    // 2. Validate product, variant, coupon and money server-side after place of supply is known.
    const cart = await cartService.validateCart({
      items: input.items,
      couponCode: input.couponCode,
      purchaseType: input.purchaseType,
      placeOfSupplyStateCode,
    }, userId);

    // 3. Create Razorpay order (amount in paise)
    const amountInPaise = cart.amountMinor;
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
          purchaseType: input.purchaseType,
          businessProfileId: businessProfile?.id,
          buyerBusinessSnapshot,
          sellerSnapshot: {
            name: env.MERCHANT_NAME, gstin: env.MERCHANT_GSTIN ?? null, address: env.MERCHANT_ADDRESS ?? null,
            phone: env.MERCHANT_PHONE ?? null, email: env.MERCHANT_EMAIL ?? null, stateCode: env.SUPPLIER_STATE_CODE ?? null,
          },
          billingAddress: businessProfile?.billingAddress ?? shippingAddress,
          taxSnapshot: {
            policyVersion: env.PRICING_POLICY_VERSION,
            mode: env.TAX_MODE,
            supplierStateCode: env.SUPPLIER_STATE_CODE ?? '',
            placeOfSupplyStateCode,
            placeOfSupplyState: shippingAddress.state,
            scenario: 'ordinary_goods_movement',
            jurisdiction: cart.taxBreakdown.jurisdiction,
            taxableMinor: cart.taxBreakdown.taxableMinor,
            cgstMinor: cart.taxBreakdown.cgstMinor,
            sgstMinor: cart.taxBreakdown.sgstMinor,
            igstMinor: cart.taxBreakdown.igstMinor,
            totalTaxMinor: cart.taxBreakdown.totalTaxMinor,
            rounding: 'half_up_per_line_minor_unit',
          },
          pricingPolicyVersion: env.PRICING_POLICY_VERSION,
          purchaseOrderReference: input.purchaseOrderReference,
          razorpayOrderId,
          shippingAddress,
          notes: input.notes,
        },
        cart.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productTitle: item.title,
          categoryIdSnapshot: item.categoryId,
          categoryNameSnapshot: item.categoryName,
          categorySnapshotSource: 'historical',
          quantity: item.quantity,
          priceAtPurchase: String(item.unitPrice),
          skuSnapshot: String(item.variantSnapshot.sku ?? ''),
          imageSnapshot: item.image,
          hsnCodeSnapshot: item.hsnCode,
          unitPriceMinor: item.unitPriceMinor,
          discountMinor: item.discountMinor,
          taxableMinor: item.taxableMinor,
          gstRateBps: item.gstRateBps,
          cgstMinor: item.cgstMinor,
          sgstMinor: item.sgstMinor,
          igstMinor: item.igstMinor,
          lineTotalMinor: item.finalMinor,
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
    return {
      ...order,
      items,
      merchant: order.sellerSnapshot ?? { name: env.MERCHANT_NAME },
    };
  },

  async getInvoice(orderId: string, userId?: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    if (userId && order.userId !== userId) throw new ForbiddenError();
    const items = await ordersRepository.getItemsWithProduct(orderId);

    return {
      merchant: {
        ...(order.sellerSnapshot ?? { name: env.MERCHANT_NAME }),
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
        billingAddress: order.billingAddress,
        purchaseType: order.purchaseType,
        buyerBusinessSnapshot: order.buyerBusinessSnapshot,
        taxSnapshot: order.taxSnapshot,
        pricingPolicyVersion: order.pricingPolicyVersion,
        invoiceNumber: order.invoiceNumber,
        invoiceIssuedAt: order.invoiceIssuedAt,
        amountMinor: order.amountMinor,
        purchaseOrderReference: order.purchaseOrderReference,
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
        categoryIdSnapshot: item.categoryIdSnapshot,
        categoryNameSnapshot: item.categoryNameSnapshot,
        categorySnapshotSource: item.categorySnapshotSource,
        productSlug: item.productSlug,
        quantity: item.quantity,
        priceAtPurchase: Number(item.priceAtPurchase),
        lineTotal: Number(item.priceAtPurchase) * item.quantity,
        variantSnapshot: item.variantSnapshot,
        skuSnapshot: item.skuSnapshot,
        imageSnapshot: item.imageSnapshot,
        hsnCodeSnapshot: item.hsnCodeSnapshot,
        unitPriceMinor: item.unitPriceMinor,
        discountMinor: item.discountMinor,
        taxableMinor: item.taxableMinor,
        gstRateBps: item.gstRateBps,
        cgstMinor: item.cgstMinor,
        sgstMinor: item.sgstMinor,
        igstMinor: item.igstMinor,
        lineTotalMinor: item.lineTotalMinor,
      })),
    };
  },

  async getAllOrders(query: OrderQuery) {
    const { data, total } = await ordersRepository.findAll(query);
    const meta = buildPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  },

  async updateStatus(orderId: string, input: UpdateOrderStatusInput, actorUserId?: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    const allowedFrom = ADMIN_TRANSITIONS[input.status] ?? [];
    if (!allowedFrom.includes(order.status)) {
      throw new AppError(`Order cannot move from ${order.status} to ${input.status}.`, 409);
    }
    const updated = await ordersRepository.transitionStatus(orderId, input.status, allowedFrom, actorUserId);
    if (!updated) throw new AppError('Order status changed in another request. Refresh and try again.', 409);
    const eventKey = input.status === 'shipped' ? 'shipment' : input.status === 'delivered' ? 'delivery' : input.status === 'cancelled' ? 'cancellation' : undefined;
    if (eventKey) await queueOrderCommunication(updated, eventKey);
    return updated;
  },

  async cancelMyOrder(userId: string, orderId: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    if (order.userId !== userId) throw new ForbiddenError();
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new AppError('This order can no longer be cancelled online.', 409);
    }
    const updated = await ordersRepository.transitionStatus(orderId, 'cancelled', ['pending', 'confirmed'], userId);
    if (!updated) throw new AppError('Order status changed in another request. Refresh and try again.', 409);
    await queueOrderCommunication(updated, 'cancellation');
    return updated;
  },

  async requestReturn(userId: string, orderId: string, reason: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    if (order.userId !== userId) throw new ForbiddenError();
    if (order.status !== 'delivered') throw new AppError('Only delivered orders can be returned.', 409);
    if (order.returnStatus !== 'none') throw new AppError('A return request has already been submitted for this order.', 409);
    const updated = await ordersRepository.requestReturn(orderId, reason, userId);
    if (!updated) throw new AppError('Could not submit return request. Please try again.', 409);
    await queueOrderCommunication(updated, 'return_update', { returnStatus: 'requested' });
    return updated;
  },

  async updateReturnStatus(orderId: string, returnStatus: 'approved' | 'rejected' | 'completed', actorUserId?: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    const updated = await ordersRepository.updateReturnStatus(orderId, returnStatus, actorUserId);
    if (!updated) throw new AppError('Could not update return status.', 409);
    await queueOrderCommunication(updated, 'return_update', { returnStatus });
    return updated;
  },

  async processRefund(orderId: string, actorUserId?: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order not found.');
    if (order.refundStatus === 'processed') throw new AppError('Refund has already been processed for this order.', 409);
    const refunded = await paymentsService.processFullRefund(orderId, actorUserId);
    await queueOrderCommunication(order, 'refund');
    return refunded;
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
