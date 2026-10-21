import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { reviews, orderItems, orders, products, type Review, type NewReview } from '../../infrastructure/database/schema/index.js';
import { createAdminNotification } from '../notifications/notifications.service.js';

export const reviewsRepository = {
  /** Public: approved reviews only */
  async findByProduct(productId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const approvedCondition = and(eq(reviews.productId, productId), eq(reviews.isApproved, true));
    const [data, countResult] = await Promise.all([
      db.select().from(reviews).where(approvedCondition).orderBy(desc(reviews.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(reviews).where(approvedCondition),
    ]);
    return { data, total: Number(countResult[0].count) };
  },

  async findByUserAndProduct(userId: string, productId: string): Promise<Review | undefined> {
    const result = await db.select().from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.productId, productId))).limit(1);
    return result[0];
  },

  async findById(reviewId: string): Promise<Review | undefined> {
    const result = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
    return result[0];
  },

  async hasUserPurchasedProduct(userId: string, productId: string): Promise<boolean> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.userId, userId), eq(orderItems.productId, productId), eq(orders.paymentStatus, 'paid')));
    return Number(result[0].count) > 0;
  },

  async create(data: NewReview, productTitle: string): Promise<Review> {
    return db.transaction(async (tx) => {
      const [review] = await tx.insert(reviews).values(data).returning();
      await createAdminNotification(tx, {
        eventKey: `review.pending:${review.id}`, type: 'review_pending', severity: 'info',
        title: 'Review awaiting moderation', message: `A new review for ${productTitle} is ready for moderation.`,
        entityType: 'review', entityId: review.id, destination: '/admin/reviews',
        metadata: { rating: review.rating },
      });
      return review;
    });
  },

  async update(reviewId: string, data: Partial<NewReview>): Promise<Review | undefined> {
    const result = await db.update(reviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reviews.id, reviewId))
      .returning();
    return result[0];
  },

  async approve(reviewId: string): Promise<Review | undefined> {
    const result = await db.update(reviews)
      .set({ isApproved: true, updatedAt: new Date() })
      .where(eq(reviews.id, reviewId))
      .returning();
    return result[0];
  },

  async reject(reviewId: string): Promise<void> {
    await db.delete(reviews).where(eq(reviews.id, reviewId));
  },

  /** Rating aggregate over APPROVED reviews only — used after any approval/rejection */
  async getProductAvgRating(productId: string): Promise<{ avg: number; count: number }> {
    const result = await db.select({
      avg: sql<number>`avg(${reviews.rating})`,
      count: sql<number>`count(*)`,
    }).from(reviews).where(and(eq(reviews.productId, productId), eq(reviews.isApproved, true)));
    return { avg: Number(result[0].avg ?? 0), count: Number(result[0].count) };
  },

  /** Recompute and persist product rating aggregate; call after any approval/rejection/deletion. */
  async recomputeProductRating(productId: string): Promise<void> {
    const { avg, count } = await this.getProductAvgRating(productId);
    await db.update(products)
      .set({ avgRating: String(Number(avg.toFixed(2))), reviewCount: count, updatedAt: new Date() })
      .where(eq(products.id, productId));
  },
};
