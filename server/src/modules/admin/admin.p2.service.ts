import {
  and, asc, desc, eq, gte, ilike, isNotNull, lt, or, sql,
} from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  blogs,
  businessProfiles,
  categories,
  coupons,
  orderItems,
  orderStatusEvents,
  orders,
  paymentAttempts,
  paymentRefunds,
  products,
  productVariants,
  reviews,
  users,
} from '../../infrastructure/database/schema/index.js';
import { buildPaginationMeta } from '../../core/utils/responseHandler.js';
import { ConflictError, NotFoundError } from '../../core/errors/appError.js';
import { dateBuckets, resolveAnalyticsRange } from './analyticsRange.js';
import type {
  AnalyticsQuery,
  CustomerListQuery,
  CustomerOrderQuery,
  InventoryListQuery,
  ReviewListQuery,
  TransactionListQuery,
} from './admin.schema.js';

const sortDirection = (direction: 'asc' | 'desc', column: any) =>
  direction === 'asc' ? asc(column) : desc(column);

const dateBoundary = (date: string, endExclusive = false) => {
  const value = new Date(`${date}T00:00:00+05:30`);
  if (endExclusive) value.setUTCDate(value.getUTCDate() + 1);
  return value;
};

const numericRow = <T extends Record<string, unknown>>(row: T | undefined) =>
  Object.fromEntries(Object.entries(row ?? {}).map(([key, value]) => [key, Number(value)])) as { [K in keyof T]: number };

export const adminP2Service = {
  async getModuleStats() {
    const [productStats, categoryStats, inventoryStats, orderStats, customerStats, paymentStats, blogStats, couponStats, reviewStats] = await Promise.all([
      db.select({
        total: sql<number>`count(*)`, active: sql<number>`count(*) filter (where ${products.isActive})`,
        archived: sql<number>`count(*) filter (where not ${products.isActive})`,
      }).from(products),
      db.select({
        total: sql<number>`count(*)`, active: sql<number>`count(*) filter (where ${categories.isActive})`,
        archived: sql<number>`count(*) filter (where not ${categories.isActive})`,
      }).from(categories),
      db.select({
        eligible: sql<number>`count(*) filter (where ${productVariants.isActive} and ${products.isActive})`,
        inStock: sql<number>`count(*) filter (where ${productVariants.isActive} and ${products.isActive} and (${productVariants.stockQuantity} - ${productVariants.reservedQuantity}) > ${productVariants.lowStockThreshold})`,
        lowStock: sql<number>`count(*) filter (where ${productVariants.isActive} and ${products.isActive} and (${productVariants.stockQuantity} - ${productVariants.reservedQuantity}) between 1 and ${productVariants.lowStockThreshold})`,
        outOfStock: sql<number>`count(*) filter (where ${productVariants.isActive} and ${products.isActive} and (${productVariants.stockQuantity} - ${productVariants.reservedQuantity}) <= 0)`,
        availableUnits: sql<number>`coalesce(sum(greatest(${productVariants.stockQuantity} - ${productVariants.reservedQuantity}, 0)) filter (where ${productVariants.isActive} and ${products.isActive}), 0)`,
      }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)),
      db.select({
        total: sql<number>`count(*)`, pending: sql<number>`count(*) filter (where ${orders.status} = 'pending')`,
        processing: sql<number>`count(*) filter (where ${orders.status} in ('confirmed', 'processing'))`,
        shipped: sql<number>`count(*) filter (where ${orders.status} = 'shipped')`,
        delivered: sql<number>`count(*) filter (where ${orders.status} = 'delivered')`,
        cancelled: sql<number>`count(*) filter (where ${orders.status} = 'cancelled')`,
        refunded: sql<number>`count(*) filter (where ${orders.status} = 'refunded')`,
      }).from(orders).where(eq(orders.isArchived, false)),
      db.select({
        registered: sql<number>`count(*)`, active: sql<number>`count(*) filter (where not ${users.isBlocked})`,
        blocked: sql<number>`count(*) filter (where ${users.isBlocked})`,
      }).from(users).where(eq(users.role, 'customer')),
      db.select({
        currency: paymentAttempts.currency,
        grossCapturedMinor: sql<number>`coalesce(sum(${paymentAttempts.amountMinor}) filter (where ${paymentAttempts.status} in ('captured', 'refunded')), 0)`,
      }).from(paymentAttempts).groupBy(paymentAttempts.currency),
      db.select({
        draft: sql<number>`count(*) filter (where ${blogs.status} = 'draft')`,
        published: sql<number>`count(*) filter (where ${blogs.status} = 'published')`,
        archived: sql<number>`count(*) filter (where ${blogs.status} = 'archived')`,
      }).from(blogs),
      db.select({
        total: sql<number>`count(*)`, active: sql<number>`count(*) filter (where ${coupons.isActive} and (${coupons.expiresAt} is null or ${coupons.expiresAt} >= now()))`,
        expired: sql<number>`count(*) filter (where ${coupons.expiresAt} < now())`,
      }).from(coupons),
      db.select({
        total: sql<number>`count(*)`, approved: sql<number>`count(*) filter (where ${reviews.isApproved})`,
        pending: sql<number>`count(*) filter (where not ${reviews.isApproved})`,
      }).from(reviews),
    ]);
    const refundByCurrency = await db.select({
      currency: paymentRefunds.currency,
      processedRefundMinor: sql<number>`coalesce(sum(${paymentRefunds.amountMinor}), 0)`,
    }).from(paymentRefunds).where(eq(paymentRefunds.status, 'processed')).groupBy(paymentRefunds.currency);
    const refundMap = new Map(refundByCurrency.map((row) => [row.currency, Number(row.processedRefundMinor)]));
    const payments = paymentStats.map((row) => ({
      currency: row.currency,
      grossCapturedMinor: Number(row.grossCapturedMinor),
      processedRefundMinor: refundMap.get(row.currency) ?? 0,
      netCollectionsMinor: Number(row.grossCapturedMinor) - (refundMap.get(row.currency) ?? 0),
      scope: 'All authoritative captured/refund events',
    }));
    return {
      products: numericRow(productStats[0]), categories: numericRow(categoryStats[0]), inventory: numericRow(inventoryStats[0]),
      orders: numericRow(orderStats[0]), customers: numericRow(customerStats[0]), payments,
      blogs: numericRow(blogStats[0]), coupons: numericRow(couponStats[0]), reviews: numericRow(reviewStats[0]),
      scope: 'Global current database totals; inventory and customer account state are current snapshots.',
    };
  },

  async getInventory(query: InventoryListQuery) {
    const availableStock = sql<number>`${productVariants.stockQuantity} - ${productVariants.reservedQuantity}`;
    const conditions = [
      eq(productVariants.isActive, true),
      eq(products.isActive, true),
      sql`${availableStock} <= ${productVariants.lowStockThreshold}`,
    ];
    if (query.search) conditions.push(or(ilike(products.title, `%${query.search}%`), ilike(productVariants.sku, `%${query.search}%`))!);
    if (query.state === 'low') conditions.push(sql`${availableStock} > 0`);
    if (query.state === 'out') conditions.push(sql`${availableStock} <= 0`);
    const where = and(...conditions);
    const sortColumns = {
      title: products.title,
      sku: productVariants.sku,
      availableStock,
      lowStockThreshold: productVariants.lowStockThreshold,
    } as const;
    const [data, count] = await Promise.all([
      db.select({
        id: productVariants.id,
        productId: products.id,
        title: products.title,
        sku: productVariants.sku,
        stockQuantity: productVariants.stockQuantity,
        reservedQuantity: productVariants.reservedQuantity,
        availableStock,
        lowStockThreshold: productVariants.lowStockThreshold,
        price: productVariants.price,
        salePrice: productVariants.salePrice,
        isActive: productVariants.isActive,
      }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId))
        .where(where)
        .orderBy(sortDirection(query.sortOrder, sortColumns[query.sortBy]), asc(productVariants.id))
        .limit(query.limit).offset((query.page - 1) * query.limit),
      db.select({ count: sql<number>`count(*)` }).from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId)).where(where),
    ]);
    return {
      data: data.map((row) => ({ ...row, availableStock: Number(row.availableStock) })),
      meta: buildPaginationMeta(query.page, query.limit, Number(count[0]?.count ?? 0)),
    };
  },

  async updateVariantStock(variantId: string, stock: number) {
    const [variant] = await db.select({ id: productVariants.id, reservedQuantity: productVariants.reservedQuantity })
      .from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
    if (!variant) throw new NotFoundError('Product variant not found.');
    if (stock < variant.reservedQuantity) {
      throw new ConflictError(`Stock cannot be lower than the ${variant.reservedQuantity} units currently reserved.`);
    }
    const [updated] = await db.update(productVariants)
      .set({ stockQuantity: stock, updatedAt: new Date() })
      .where(eq(productVariants.id, variantId))
      .returning({ id: productVariants.id, stockQuantity: productVariants.stockQuantity, reservedQuantity: productVariants.reservedQuantity });
    return { ...updated, availableStock: updated.stockQuantity - updated.reservedQuantity };
  },

  async getPendingReviews(query: ReviewListQuery) {
    const conditions = [eq(reviews.isApproved, false)];
    if (query.rating) conditions.push(eq(reviews.rating, query.rating));
    if (query.search) conditions.push(or(
      ilike(reviews.title, `%${query.search}%`),
      ilike(reviews.body, `%${query.search}%`),
      ilike(products.title, `%${query.search}%`),
      ilike(users.name, `%${query.search}%`),
    )!);
    const where = and(...conditions);
    const sortColumns = { createdAt: reviews.createdAt, rating: reviews.rating } as const;
    const [data, count] = await Promise.all([
      db.select({
        id: reviews.id, productId: reviews.productId, userId: reviews.userId,
        rating: reviews.rating, title: reviews.title, body: reviews.body,
        isVerifiedBuyer: reviews.isVerifiedBuyer, isApproved: reviews.isApproved,
        createdAt: reviews.createdAt, productTitle: products.title, userName: users.name,
      }).from(reviews).innerJoin(products, eq(products.id, reviews.productId)).innerJoin(users, eq(users.id, reviews.userId))
        .where(where).orderBy(sortDirection(query.sortOrder, sortColumns[query.sortBy]), desc(reviews.id))
        .limit(query.limit).offset((query.page - 1) * query.limit),
      db.select({ count: sql<number>`count(*)` }).from(reviews)
        .innerJoin(products, eq(products.id, reviews.productId)).innerJoin(users, eq(users.id, reviews.userId)).where(where),
    ]);
    return { data, meta: buildPaginationMeta(query.page, query.limit, Number(count[0]?.count ?? 0)) };
  },

  async getCustomers(query: CustomerListQuery) {
    const conditions = [eq(users.role, 'customer')];
    if (query.search) conditions.push(or(ilike(users.name, `%${query.search}%`), ilike(users.email, `%${query.search}%`))!);
    if (query.state === 'active') conditions.push(eq(users.isBlocked, false));
    if (query.state === 'blocked') conditions.push(eq(users.isBlocked, true));
    const where = and(...conditions);
    const computed = {
      orderCount: sql<number>`(select count(*) from orders customer_orders where customer_orders.user_id = "users"."id")`,
      grossPaidMinor: sql<number>`coalesce((select sum(pa.amount_minor) from payment_attempts pa join orders paid_orders on paid_orders.id = pa.order_id where paid_orders.user_id = "users"."id" and pa.status in ('captured', 'refunded')), 0)`,
      refundedMinor: sql<number>`coalesce((select sum(pr.amount_minor) from payment_refunds pr join orders refunded_orders on refunded_orders.id = pr.order_id where refunded_orders.user_id = "users"."id" and pr.status = 'processed'), 0)`,
    };
    const sortColumns = { name: users.name, email: users.email, createdAt: users.createdAt, orderCount: computed.orderCount, netPaidMinor: sql`${computed.grossPaidMinor} - ${computed.refundedMinor}` } as const;
    const [data, count] = await Promise.all([
      db.select({
        id: users.id, name: users.name, email: users.email, phone: users.phone, avatarUrl: users.avatarUrl,
        isVerified: users.isVerified, isBlocked: users.isBlocked, createdAt: users.createdAt,
        orderCount: computed.orderCount, grossPaidMinor: computed.grossPaidMinor, refundedMinor: computed.refundedMinor,
        netPaidMinor: sql<number>`${computed.grossPaidMinor} - ${computed.refundedMinor}`,
      }).from(users).where(where)
        .orderBy(sortDirection(query.sortOrder, sortColumns[query.sortBy]), desc(users.id))
        .limit(query.limit).offset((query.page - 1) * query.limit),
      db.select({ count: sql<number>`count(*)` }).from(users).where(where),
    ]);
    return {
      data: data.map((row) => ({
        ...row,
        orderCount: Number(row.orderCount),
        grossPaidMinor: Number(row.grossPaidMinor),
        refundedMinor: Number(row.refundedMinor),
        netPaidMinor: Number(row.netPaidMinor),
      })),
      meta: buildPaginationMeta(query.page, query.limit, Number(count[0]?.count ?? 0)),
    };
  },

  async getCustomerDetail(userId: string) {
    const [customer] = await db.select({
      id: users.id, name: users.name, email: users.email, phone: users.phone, avatarUrl: users.avatarUrl,
      isVerified: users.isVerified, isBlocked: users.isBlocked, createdAt: users.createdAt, updatedAt: users.updatedAt,
    }).from(users).where(and(eq(users.id, userId), eq(users.role, 'customer'))).limit(1);
    if (!customer) throw new NotFoundError('Customer not found.');
    const [businesses, orderSummary] = await Promise.all([
      db.select({
        id: businessProfiles.id, gstin: businessProfiles.gstin, legalName: businessProfiles.legalName,
        tradeName: businessProfiles.tradeName, registrationStateName: businessProfiles.registrationStateName,
        isDefault: businessProfiles.isDefault, isArchived: businessProfiles.isArchived, verifiedAt: businessProfiles.verifiedAt,
      }).from(businessProfiles).where(eq(businessProfiles.userId, userId)).orderBy(desc(businessProfiles.isDefault)),
      db.select({
        orderCount: sql<number>`count(*)`,
        paidOrderCount: sql<number>`count(*) filter (where ${orders.paymentStatus} in ('paid', 'refunded'))`,
      }).from(orders).where(eq(orders.userId, userId)),
    ]);
    const [money] = await db.select({
      grossCapturedMinor: sql<number>`coalesce(sum(${paymentAttempts.amountMinor}) filter (where ${paymentAttempts.status} in ('captured', 'refunded')), 0)`,
    }).from(paymentAttempts).innerJoin(orders, eq(orders.id, paymentAttempts.orderId)).where(eq(orders.userId, userId));
    const [refunds] = await db.select({
      processedRefundMinor: sql<number>`coalesce(sum(${paymentRefunds.amountMinor}), 0)`,
    }).from(paymentRefunds).innerJoin(orders, eq(orders.id, paymentRefunds.orderId))
      .where(and(eq(orders.userId, userId), eq(paymentRefunds.status, 'processed')));
    const gross = Number(money.grossCapturedMinor);
    const refunded = Number(refunds.processedRefundMinor);
    return {
      customer,
      businesses,
      summary: {
        orderCount: Number(orderSummary[0]?.orderCount ?? 0),
        paidOrderCount: Number(orderSummary[0]?.paidOrderCount ?? 0),
        grossCapturedMinor: gross,
        processedRefundMinor: refunded,
        netPaidMinor: gross - refunded,
        currency: 'INR',
      },
    };
  },

  async getCustomerOrders(userId: string, query: CustomerOrderQuery) {
    const conditions = [eq(orders.userId, userId)];
    if (query.search) conditions.push(ilike(orders.orderNumber, `%${query.search}%`));
    if (query.status) conditions.push(eq(orders.status, query.status));
    if (query.paymentStatus) conditions.push(eq(orders.paymentStatus, query.paymentStatus));
    if (query.dateFrom) conditions.push(gte(orders.createdAt, dateBoundary(query.dateFrom)));
    if (query.dateTo) conditions.push(lt(orders.createdAt, dateBoundary(query.dateTo, true)));
    const where = and(...conditions);
    const sortColumns = { orderNumber: orders.orderNumber, createdAt: orders.createdAt, total: orders.total, status: orders.status } as const;
    const [data, count] = await Promise.all([
      db.select().from(orders).where(where).orderBy(sortDirection(query.sortOrder, sortColumns[query.sortBy]), desc(orders.id))
        .limit(query.limit).offset((query.page - 1) * query.limit),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(where),
    ]);
    return { data, meta: buildPaginationMeta(query.page, query.limit, Number(count[0]?.count ?? 0)) };
  },

  async getOrders(query: CustomerOrderQuery) {
    const conditions = [eq(orders.isArchived, false)];
    if (query.search) conditions.push(ilike(orders.orderNumber, `%${query.search}%`));
    if (query.status) conditions.push(eq(orders.status, query.status));
    if (query.paymentStatus) conditions.push(eq(orders.paymentStatus, query.paymentStatus));
    if (query.dateFrom) conditions.push(gte(orders.createdAt, dateBoundary(query.dateFrom)));
    if (query.dateTo) conditions.push(lt(orders.createdAt, dateBoundary(query.dateTo, true)));
    const where = and(...conditions);
    const sortColumns = { orderNumber: orders.orderNumber, createdAt: orders.createdAt, total: orders.total, status: orders.status } as const;
    const [data, count] = await Promise.all([
      db.select().from(orders).where(where).orderBy(sortDirection(query.sortOrder, sortColumns[query.sortBy]), desc(orders.id))
        .limit(query.limit).offset((query.page - 1) * query.limit),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(where),
    ]);
    return { data, meta: buildPaginationMeta(query.page, query.limit, Number(count[0]?.count ?? 0)) };
  },

  async getOrderDetail(orderId: string) {
    const [order] = await db.select({
      order: orders,
      customerId: users.id, customerName: users.name, customerEmail: users.email, customerPhone: users.phone,
    }).from(orders).leftJoin(users, eq(users.id, orders.userId)).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new NotFoundError('Order not found.');
    const [items, payments] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(asc(orderItems.createdAt), asc(orderItems.id)),
      db.select().from(paymentAttempts).where(eq(paymentAttempts.orderId, orderId)).orderBy(desc(paymentAttempts.createdAt), desc(paymentAttempts.id)),
    ]);
    const refunds = await db.select().from(paymentRefunds).where(eq(paymentRefunds.orderId, orderId)).orderBy(desc(paymentRefunds.createdAt), desc(paymentRefunds.id));
    const statusHistory = await db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, orderId)).orderBy(asc(orderStatusEvents.createdAt), asc(orderStatusEvents.id));
    const capturedMinor = payments.filter((payment) => payment.status === 'captured' || payment.status === 'refunded').reduce((sum, payment) => sum + payment.amountMinor, 0);
    const committedRefundMinor = refunds.filter((refund) => refund.status === 'processed' || refund.status === 'pending').reduce((sum, refund) => sum + refund.amountMinor, 0);
    const allowedActions = {
      fulfilment: order.order.status === 'pending' ? ['confirmed', 'cancelled']
        : order.order.status === 'confirmed' ? ['processing', 'cancelled']
          : order.order.status === 'processing' ? ['shipped']
            : order.order.status === 'shipped' ? ['delivered'] : [],
      return: order.order.returnStatus === 'requested' ? ['approved', 'rejected']
        : order.order.returnStatus === 'approved' ? ['completed'] : [],
      canRefund: capturedMinor > committedRefundMinor,
    };
    return { ...order.order, customer: order.customerId ? { id: order.customerId, name: order.customerName, email: order.customerEmail, phone: order.customerPhone } : null, items, payments, refunds, statusHistory, allowedActions };
  },

  async getTransactions(query: TransactionListQuery) {
    const conditions = [];
    if (query.status) conditions.push(eq(paymentAttempts.status, query.status));
    if (query.search) conditions.push(or(
      ilike(paymentAttempts.providerOrderId, `%${query.search}%`),
      ilike(paymentAttempts.providerPaymentId, `%${query.search}%`),
      ilike(orders.orderNumber, `%${query.search}%`), ilike(users.email, `%${query.search}%`)
    )!);
    if (query.dateFrom) conditions.push(gte(paymentAttempts.createdAt, dateBoundary(query.dateFrom)));
    if (query.dateTo) conditions.push(lt(paymentAttempts.createdAt, dateBoundary(query.dateTo, true)));
    const where = conditions.length ? and(...conditions) : undefined;
    const sortColumns = { createdAt: paymentAttempts.createdAt, capturedAt: paymentAttempts.capturedAt, amountMinor: paymentAttempts.amountMinor, status: paymentAttempts.status } as const;
    const [data, count] = await Promise.all([
      db.select({
        id: paymentAttempts.id, orderId: orders.id, orderNumber: orders.orderNumber,
        customerId: users.id, customerName: users.name, customerEmail: users.email,
        provider: paymentAttempts.provider, providerOrderId: paymentAttempts.providerOrderId,
        providerPaymentId: paymentAttempts.providerPaymentId, amountMinor: paymentAttempts.amountMinor,
        currency: paymentAttempts.currency, status: paymentAttempts.status, failureReason: paymentAttempts.failureReason,
        capturedAt: paymentAttempts.capturedAt, createdAt: paymentAttempts.createdAt, updatedAt: paymentAttempts.updatedAt,
        processedRefundMinor: sql<number>`coalesce((select sum(pr.amount_minor) from ${paymentRefunds} pr where pr.payment_attempt_id = ${paymentAttempts.id} and pr.status = 'processed'), 0)`,
      }).from(paymentAttempts).innerJoin(orders, eq(orders.id, paymentAttempts.orderId)).leftJoin(users, eq(users.id, orders.userId))
        .where(where).orderBy(sortDirection(query.sortOrder, sortColumns[query.sortBy]), desc(paymentAttempts.id))
        .limit(query.limit).offset((query.page - 1) * query.limit),
      db.select({ count: sql<number>`count(*)` }).from(paymentAttempts).innerJoin(orders, eq(orders.id, paymentAttempts.orderId)).leftJoin(users, eq(users.id, orders.userId)).where(where),
    ]);
    return {
      data: data.map((row) => {
        const processedRefundMinor = Number(row.processedRefundMinor);
        const grossCapturedMinor = ['captured', 'refunded'].includes(row.status) ? row.amountMinor : 0;
        return { ...row, grossCapturedMinor, processedRefundMinor, remainingRefundableMinor: Math.max(grossCapturedMinor - processedRefundMinor, 0) };
      }),
      meta: buildPaginationMeta(query.page, query.limit, Number(count[0]?.count ?? 0)),
    };
  },

  async getTransactionDetail(id: string) {
    const [attempt] = await db.select({
      id: paymentAttempts.id, orderId: orders.id, orderNumber: orders.orderNumber,
      customerId: users.id, customerName: users.name, customerEmail: users.email,
      provider: paymentAttempts.provider, providerOrderId: paymentAttempts.providerOrderId,
      providerPaymentId: paymentAttempts.providerPaymentId, amountMinor: paymentAttempts.amountMinor,
      currency: paymentAttempts.currency, status: paymentAttempts.status, failureReason: paymentAttempts.failureReason,
      capturedAt: paymentAttempts.capturedAt, finalizedAt: paymentAttempts.finalizedAt,
      createdAt: paymentAttempts.createdAt, updatedAt: paymentAttempts.updatedAt,
    }).from(paymentAttempts).innerJoin(orders, eq(orders.id, paymentAttempts.orderId))
      .leftJoin(users, eq(users.id, orders.userId)).where(eq(paymentAttempts.id, id)).limit(1);
    if (!attempt) throw new NotFoundError('Transaction not found.');
    const refunds = await db.select().from(paymentRefunds).where(eq(paymentRefunds.paymentAttemptId, id)).orderBy(desc(paymentRefunds.createdAt), desc(paymentRefunds.id));
    const processedRefundMinor = refunds.filter((refund) => refund.status === 'processed').reduce((sum, refund) => sum + refund.amountMinor, 0);
    return { ...attempt, refunds, grossCapturedMinor: ['captured', 'refunded'].includes(attempt.status) ? attempt.amountMinor : 0, processedRefundMinor, remainingRefundableMinor: Math.max(attempt.amountMinor - processedRefundMinor, 0) };
  },

  async getAnalytics(query: AnalyticsQuery) {
    const range = resolveAnalyticsRange(query);
    const captureWhere = and(
      or(eq(paymentAttempts.status, 'captured'), eq(paymentAttempts.status, 'refunded')),
      eq(paymentAttempts.currency, query.currency), isNotNull(paymentAttempts.capturedAt),
      gte(paymentAttempts.capturedAt, range.startUtc), lt(paymentAttempts.capturedAt, range.endExclusive)
    );
    const refundWhere = and(
      eq(paymentRefunds.status, 'processed'), eq(paymentRefunds.currency, query.currency),
      isNotNull(paymentRefunds.processedAt), gte(paymentRefunds.processedAt, range.startUtc), lt(paymentRefunds.processedAt, range.endExclusive)
    );
    const [captureTotal, refundTotal, capturesByDay, refundsByDay, orderDaily, statusBreakdown, categorySales, stock, customerTotals, newCustomers, purchasing] = await Promise.all([
      db.select({ total: sql<number>`coalesce(sum(${paymentAttempts.amountMinor}), 0)` }).from(paymentAttempts).where(captureWhere),
      db.select({ total: sql<number>`coalesce(sum(${paymentRefunds.amountMinor}), 0)`, unresolved: sql<number>`count(*) filter (where ${paymentRefunds.merchandiseMinor} is null)` }).from(paymentRefunds).where(refundWhere),
      db.select({ date: sql<string>`to_char(${paymentAttempts.capturedAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`, amount: sql<number>`sum(${paymentAttempts.amountMinor})` })
        .from(paymentAttempts).where(captureWhere).groupBy(sql`to_char(${paymentAttempts.capturedAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`),
      db.select({ date: sql<string>`to_char(${paymentRefunds.processedAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`, amount: sql<number>`sum(${paymentRefunds.amountMinor})` })
        .from(paymentRefunds).where(refundWhere).groupBy(sql`to_char(${paymentRefunds.processedAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`),
      db.select({ date: sql<string>`to_char(${orders.createdAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`, count: sql<number>`count(*)` })
        .from(orders).where(and(gte(orders.createdAt, range.startUtc), lt(orders.createdAt, range.endExclusive)))
        .groupBy(sql`to_char(${orders.createdAt} AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`),
      db.select({ status: orders.status, count: sql<number>`count(*)` }).from(orders)
        .where(and(gte(orders.createdAt, range.startUtc), lt(orders.createdAt, range.endExclusive))).groupBy(orders.status),
      db.select({
        category: orderItems.categoryNameSnapshot, source: orderItems.categorySnapshotSource,
        units: sql<number>`sum(${orderItems.quantity})`, merchandiseMinor: sql<number>`sum(${orderItems.taxableMinor})`,
      }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(sql`exists (select 1 from ${paymentAttempts} pa where pa.order_id = ${orders.id} and pa.status in ('captured','refunded') and pa.currency = ${query.currency} and pa.captured_at >= ${range.startUtc} and pa.captured_at < ${range.endExclusive})`)
        .groupBy(orderItems.categoryNameSnapshot, orderItems.categorySnapshotSource).orderBy(desc(sql`sum(${orderItems.taxableMinor})`)),
      db.select({
        eligibleVariants: sql<number>`count(*)`,
        inStock: sql<number>`count(*) filter (where (${productVariants.stockQuantity} - ${productVariants.reservedQuantity}) > ${productVariants.lowStockThreshold})`,
        lowStock: sql<number>`count(*) filter (where (${productVariants.stockQuantity} - ${productVariants.reservedQuantity}) between 1 and ${productVariants.lowStockThreshold})`,
        outOfStock: sql<number>`count(*) filter (where (${productVariants.stockQuantity} - ${productVariants.reservedQuantity}) <= 0)`,
        availableUnits: sql<number>`coalesce(sum(greatest(${productVariants.stockQuantity} - ${productVariants.reservedQuantity}, 0)), 0)`,
      }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(and(eq(productVariants.isActive, true), eq(products.isActive, true))),
      db.select({ registered: sql<number>`count(*)`, active: sql<number>`count(*) filter (where not ${users.isBlocked})`, blocked: sql<number>`count(*) filter (where ${users.isBlocked})` }).from(users).where(eq(users.role, 'customer')),
      db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, 'customer'), gte(users.createdAt, range.startUtc), lt(users.createdAt, range.endExclusive))),
      db.execute(sql`select count(*)::int as purchasing, count(*) filter (where captures > 1)::int as repeat from (select o.user_id, count(distinct pa.id) as captures from ${paymentAttempts} pa join ${orders} o on o.id = pa.order_id where pa.status in ('captured','refunded') and pa.currency = ${query.currency} and pa.captured_at >= ${range.startUtc} and pa.captured_at < ${range.endExclusive} and o.user_id is not null group by o.user_id) x`),
    ]);
    const gross = Number(captureTotal[0]?.total ?? 0);
    const refunded = Number(refundTotal[0]?.total ?? 0);
    const captureMap = new Map(capturesByDay.map((row) => [row.date, Number(row.amount)]));
    const refundMap = new Map(refundsByDay.map((row) => [row.date, Number(row.amount)]));
    const orderMap = new Map(orderDaily.map((row) => [row.date, Number(row.count)]));
    const daily = dateBuckets(range.start, range.days).map((date) => ({
      date, grossCapturedMinor: captureMap.get(date) ?? 0, processedRefundMinor: refundMap.get(date) ?? 0,
      netCollectionsMinor: (captureMap.get(date) ?? 0) - (refundMap.get(date) ?? 0), ordersCreated: orderMap.get(date) ?? 0,
    }));
    const purchasingRow = (purchasing as any).rows?.[0] ?? {};
    return {
      appliedRange: { start: range.start, end: range.end, startUtc: range.startUtc.toISOString(), endExclusiveUtc: range.endExclusive.toISOString(), timezone: range.timezone, grouping: range.grouping },
      currency: query.currency,
      collections: { grossCapturedMinor: gross, processedRefundMinor: refunded, netCollectionsMinor: gross - refunded, scope: 'Event-date cash flow' },
      daily,
      statusBreakdown: statusBreakdown.map((row) => ({ ...row, count: Number(row.count) })),
      categorySales: categorySales.map((row) => ({ ...row, units: Number(row.units), merchandiseMinor: Number(row.merchandiseMinor) })),
      refundAllocation: { unresolvedProcessedRefunds: Number(refundTotal[0]?.unresolved ?? 0), note: 'Category merchandise totals are gross where processed legacy refunds lack category allocations.' },
      stock: { ...numericRow(stock[0]), scope: 'Current snapshot; date range does not apply.' },
      customers: { ...numericRow(customerTotals[0]), newInRange: Number(newCustomers[0]?.count ?? 0), purchasingInRange: Number(purchasingRow.purchasing ?? 0), repeatPurchasersInRange: Number(purchasingRow.repeat ?? 0), purchasingDefinition: 'Customers with at least one captured payment event in range; repeat means more than one distinct captured payment.' },
    };
  },
};
