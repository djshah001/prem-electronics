import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db';
import { reviews, orderItems, orders, type Review, type NewReview } from '../../infrastructure/database/schema/index';

export const reviewsRepository = {
  async findByProduct(productId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const [data, countResult] = await Promise.all([
      db.select().from(reviews).where(eq(reviews.productId, productId)).orderBy(desc(reviews.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(reviews).where(eq(reviews.productId, productId)),
    ]);
    return { data, total: Number(countResult[0].count) };
  },

  async findByUserAndProduct(userId: string, productId: string): Promise<Review | undefined> {
    const result = await db.select().from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.productId, productId))).limit(1);
    return result[0];
  },

  async hasUserPurchasedProduct(userId: string, productId: string): Promise<boolean> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.userId, userId), eq(orderItems.productId, productId), eq(orders.paymentStatus, 'paid')));
    return Number(result[0].count) > 0;
  },

  async create(data: NewReview): Promise<Review> {
    const result = await db.insert(reviews).values(data).returning();
    return result[0];
  },

  async getProductAvgRating(productId: string): Promise<{ avg: number; count: number }> {
    const result = await db.select({
      avg: sql<number>`avg(${reviews.rating})`,
      count: sql<number>`count(*)`,
    }).from(reviews).where(eq(reviews.productId, productId));
    return { avg: Number(result[0].avg ?? 0), count: Number(result[0].count) };
  },
};
