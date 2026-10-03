import { sql, eq, gte, desc, and, inArray } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  orders,
  users,
  products,
  categories,
  orderItems,
  reviews,
} from '../../infrastructure/database/schema/index.js';
import { reviewsService } from '../reviews/reviews.service.js';

export const adminService = {
  async getDashboardMetrics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalRevenueResult,
      totalOrdersResult,
      totalUsersResult,
      recentOrdersResult,
      topProductsResult,
      lowStockResult,
      revenueByDayResult,
    ] = await Promise.all([
      db.select({ total: sql<number>`sum(${orders.total})` })
        .from(orders)
        .where(eq(orders.paymentStatus, 'paid')),

      db.select({ count: sql<number>`count(*)` }).from(orders),

      db.select({ count: sql<number>`count(*)` }).from(users),

      db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5),

      db.select({
        productId: orderItems.productId,
        totalSold: sql<number>`sum(${orderItems.quantity})`,
        revenue: sql<number>`sum(${orderItems.quantity} * ${orderItems.priceAtPurchase})`,
      })
        .from(orderItems)
        .groupBy(orderItems.productId)
        .orderBy(desc(sql`sum(${orderItems.quantity})`))
        .limit(5),

      db.select({ id: products.id, title: products.title, stock: products.stock, threshold: products.lowStockThreshold })
        .from(products)
        .where(and(sql`${products.stock} <= ${products.lowStockThreshold}`, eq(products.isActive, true)))
        .orderBy(products.stock)
        .limit(10),

      db.select({
        date: sql<string>`date(${orders.createdAt})`,
        revenue: sql<number>`sum(${orders.total})`,
        count: sql<number>`count(*)`,
      })
        .from(orders)
        .where(sql`${orders.createdAt} >= ${thirtyDaysAgo} and ${orders.paymentStatus} = 'paid'`)
        .groupBy(sql`date(${orders.createdAt})`)
        .orderBy(sql`date(${orders.createdAt})`),
    ]);

    return {
      revenue: {
        total: Number(totalRevenueResult[0]?.total ?? 0),
        last30Days: revenueByDayResult.reduce((sum, d) => sum + Number(d.revenue), 0),
        byDay: revenueByDayResult,
      },
      orders: {
        total: Number(totalOrdersResult[0].count),
        recent: recentOrdersResult,
      },
      users: {
        total: Number(totalUsersResult[0].count),
      },
      topProducts: topProductsResult,
      lowStockAlerts: lowStockResult,
    };
  },

  async getAnalytics(period: number = 30) {
    const from = new Date();
    from.setDate(from.getDate() - period);

    const [revenue, orderCounts, statusBreakdown] = await Promise.all([
      db.select({
        date: sql<string>`date(${orders.createdAt})`,
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
        orders: sql<number>`count(*)`,
      })
        .from(orders)
        .where(and(gte(orders.createdAt, from), eq(orders.paymentStatus, 'paid')))
        .groupBy(sql`date(${orders.createdAt})`)
        .orderBy(sql`date(${orders.createdAt})`),

      db.select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(gte(orders.createdAt, from)),

      db.select({
        status: orders.status,
        count: sql<number>`count(*)`,
      })
        .from(orders)
        .where(gte(orders.createdAt, from))
        .groupBy(orders.status),
    ]);

    return {
      period,
      revenue,
      totalOrders: Number(orderCounts[0]?.count ?? 0),
      statusBreakdown,
    };
  },

  async getLowStock(threshold?: number) {
    const query = db.select({
      id: products.id,
      title: products.title,
      sku: products.sku,
      stock: products.stock,
      lowStockThreshold: products.lowStockThreshold,
      price: products.price,
      isActive: products.isActive,
    })
      .from(products)
      .where(
        and(
          sql`${products.stock} <= ${threshold ?? products.lowStockThreshold}`,
          eq(products.isActive, true)
        )
      )
      .orderBy(products.stock);

    return query;
  },

  async getCustomers(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;

    const conditions = [eq(users.role, 'customer')];
    if (search) {
      conditions.push(
        sql`(${users.name} ilike ${'%' + search + '%'} or ${users.email} ilike ${'%' + search + '%'})` as any
      );
    }
    const whereClause = and(...conditions);

    const [customerList, total] = await Promise.all([
      db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        isVerified: users.isVerified,
        isBlocked: users.isBlocked,
        createdAt: users.createdAt,
        orderCount: sql<number>`(select count(*) from ${orders} where ${orders.userId} = ${users.id})`,
        totalSpent: sql<number>`coalesce((select sum(${orders.total}) from ${orders} where ${orders.userId} = ${users.id} and ${orders.paymentStatus} = 'paid'), 0)`,
      })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),

      db.select({ count: sql<number>`count(*)` }).from(users).where(whereClause),
    ]);

    return { data: customerList, total: Number(total[0].count) };
  },

  async toggleBlockCustomer(userId: string, block: boolean) {
    const result = await db
      .update(users)
      .set({ isBlocked: block, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, isBlocked: users.isBlocked });
    return result[0];
  },

  async getPendingReviews(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const [reviewList, total] = await Promise.all([
      db.select({
        id: reviews.id,
        productId: reviews.productId,
        userId: reviews.userId,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        isVerifiedBuyer: reviews.isVerifiedBuyer,
        isApproved: reviews.isApproved,
        createdAt: reviews.createdAt,
        productTitle: sql<string>`(select title from ${products} where ${products.id} = ${reviews.productId})`,
        userName: sql<string>`(select name from ${users} where ${users.id} = ${reviews.userId})`,
      })
        .from(reviews)
        .where(eq(reviews.isApproved, false))
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(offset),

      db.select({ count: sql<number>`count(*)` }).from(reviews).where(eq(reviews.isApproved, false)),
    ]);

    return { data: reviewList, total: Number(total[0].count) };
  },

  async approveReview(reviewId: string) {
    return reviewsService.approveReview(reviewId);
  },

  async rejectReview(reviewId: string) {
    return reviewsService.rejectReview(reviewId);
  },

  async updateStock(productId: string, stock: number) {
    const result = await db
      .update(products)
      .set({ stock, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning({ id: products.id, stock: products.stock });
    return result[0];
  },

  // ─── Bulk Delete ────────────────────────────────────────────────────────────

  async bulkDeleteProducts(ids: string[]) {
    const archived = await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(inArray(products.id, ids))
      .returning({ id: products.id });
    return { archived: archived.length, ids: archived.map((item) => item.id) };
  },

  async bulkDeleteCategories(ids: string[]) {
    const [productDependencies, childDependencies] = await Promise.all([
      db.select({ id: products.categoryId })
        .from(products)
        .where(and(inArray(products.categoryId, ids), eq(products.isActive, true))),
      db.select({ id: categories.parentId })
        .from(categories)
        .where(and(inArray(categories.parentId, ids), eq(categories.isActive, true))),
    ]);
    const blockedIds = new Set([
      ...productDependencies.map((item) => item.id).filter(Boolean),
      ...childDependencies.map((item) => item.id).filter(Boolean),
    ] as string[]);
    const eligibleIds = ids.filter((id) => !blockedIds.has(id));
    const archived = eligibleIds.length > 0
      ? await db.update(categories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(inArray(categories.id, eligibleIds))
        .returning({ id: categories.id })
      : [];
    return {
      archived: archived.length,
      ids: archived.map((item) => item.id),
      failed: ids.filter((id) => blockedIds.has(id)).map((id) => ({
        id,
        reason: 'Category has active products or child categories.',
      })),
    };
  },

  async bulkDeleteUsers(ids: string[]) {
    const blocked = await db.update(users)
      .set({ isBlocked: true, updatedAt: new Date() })
      .where(and(inArray(users.id, ids), eq(users.role, 'customer')))
      .returning({ id: users.id });
    const blockedIds = new Set(blocked.map((item) => item.id));
    return {
      blocked: blocked.length,
      ids: [...blockedIds],
      failed: ids.filter((id) => !blockedIds.has(id)).map((id) => ({
        id,
        reason: 'Only customer accounts can be blocked by this bulk action.',
      })),
    };
  },

  async bulkDeleteOrders(ids: string[]) {
    const archived = await db.update(orders)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(inArray(orders.id, ids))
      .returning({ id: orders.id });
    return { archived: archived.length, ids: archived.map((item) => item.id) };
  },

  // ─── Admin Categories ───────────────────────────────────────────────────────

  async getCategoriesAdmin(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;
    const whereClause = search
      ? sql`(${categories.name} ilike ${'%' + search + '%'} or ${categories.slug} ilike ${'%' + search + '%'})`
      : undefined;

    const [data, total] = await Promise.all([
      db.select().from(categories).where(whereClause as any).orderBy(desc(categories.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(categories).where(whereClause as any),
    ]);
    return { data, total: Number(total[0].count) };
  },

  // ─── Admin Orders (server-side) ─────────────────────────────────────────────

  async getOrdersAdmin(page: number, limit: number, search?: string, status?: string, sortBy = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(orders.isArchived, false)];
    if (status) conditions.push(eq(orders.status, status as any));
    if (search) {
      conditions.push(
        sql`(${orders.orderNumber} ilike ${'%' + search + '%'})`
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sortCol = (orders as any)[sortBy] ?? orders.createdAt;
    const orderClause = sortOrder === 'asc' ? sql`${sortCol} asc` : sql`${sortCol} desc`;

    const [data, total] = await Promise.all([
      db.select().from(orders).where(whereClause).orderBy(orderClause).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause),
    ]);
    return { data, total: Number(total[0].count) };
  },
};
