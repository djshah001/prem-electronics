import { sql, eq, gte, desc, and, lte } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db';
import {
  orders,
  users,
  products,
  orderItems,
  reviews,
} from '../../infrastructure/database/schema/index';

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
    const result = await db
      .update(reviews)
      .set({ isApproved: true, updatedAt: new Date() })
      .where(eq(reviews.id, reviewId))
      .returning();
    return result[0];
  },

  async rejectReview(reviewId: string) {
    await db.delete(reviews).where(eq(reviews.id, reviewId));
  },

  async updateStock(productId: string, stock: number) {
    const result = await db
      .update(products)
      .set({ stock, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning({ id: products.id, stock: products.stock });
    return result[0];
  },
};
