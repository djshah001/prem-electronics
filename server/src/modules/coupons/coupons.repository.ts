import { eq, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db';
import { coupons, type Coupon, type NewCoupon } from '../../infrastructure/database/schema/index';

export const couponsRepository = {
  async findAll(): Promise<Coupon[]> {
    return db.select().from(coupons).orderBy(coupons.createdAt);
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

  async delete(id: string): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, id));
  },
};
