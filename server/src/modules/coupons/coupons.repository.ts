import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { couponRedemptions, coupons, orders, type Coupon, type NewCoupon } from '../../infrastructure/database/schema/index.js';
import type { CouponListQuery } from './coupons.schema.js';

export const couponsRepository = {
  async findAll(query: CouponListQuery): Promise<{ data: Coupon[]; total: number }> {
    const conditions = [];
    if (query.search) conditions.push(or(ilike(coupons.code, `%${query.search}%`), ilike(coupons.description, `%${query.search}%`))!);
    if (query.state === 'active') conditions.push(and(eq(coupons.isActive, true), sql`(${coupons.expiresAt} is null or ${coupons.expiresAt} >= now())`)!);
    if (query.state === 'inactive') conditions.push(eq(coupons.isActive, false));
    if (query.state === 'expired') conditions.push(sql`${coupons.expiresAt} < now()`);
    const where = conditions.length ? and(...conditions) : undefined;
    const sortColumns = {
      code: coupons.code, createdAt: coupons.createdAt, expiresAt: coupons.expiresAt,
      usedCount: coupons.usedCount, isActive: coupons.isActive,
    } as const;
    const direction = query.sortOrder === 'asc' ? asc : desc;
    const [data, count] = await Promise.all([
      db.select().from(coupons).where(where)
        .orderBy(direction(sortColumns[query.sortBy]), desc(coupons.id))
        .limit(query.limit).offset((query.page - 1) * query.limit),
      db.select({ count: sql<number>`count(*)` }).from(coupons).where(where),
    ]);
    return { data, total: Number(count[0]?.count ?? 0) };
  },

  async findByCode(code: string): Promise<Coupon | undefined> {
    const result = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code.toUpperCase()))
      .limit(1);
    return result[0];
  },

  async findById(id: string): Promise<Coupon | undefined> {
    const result = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    return result[0];
  },

  async create(data: NewCoupon): Promise<Coupon> {
    const result = await db.insert(coupons).values(data).returning();
    return result[0];
  },

  async update(id: string, data: Partial<NewCoupon>): Promise<Coupon> {
    const result = await db
      .update(coupons)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(coupons.id, id))
      .returning();
    return result[0];
  },

  async incrementUsage(id: string): Promise<void> {
    await db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1`, updatedAt: new Date() })
      .where(eq(coupons.id, id));
  },

  async countUserRedemptions(couponId: string, userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(couponRedemptions)
      .where(sql`${couponRedemptions.couponId} = ${couponId} and ${couponRedemptions.userId} = ${userId}`);
    return Number(result.count);
  },

  async countPaidOrders(userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(orders)
      .where(sql`${orders.userId} = ${userId} and ${orders.paymentStatus} = 'paid'`);
    return Number(result.count);
  },

  async delete(id: string): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, id));
  },
};
