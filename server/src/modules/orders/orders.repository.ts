import { eq, desc, asc, and, sql, inArray, ilike, or } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db';
import {
  orders,
  orderItems,
  type Order,
  type NewOrder,
  type NewOrderItem,
  type OrderItem,
} from '../../infrastructure/database/schema/index';
import type { OrderQuery } from './orders.schema';

export const ordersRepository = {
  async findByUserId(userId: string, query: OrderQuery): Promise<{ data: Order[]; total: number }> {
    const offset = (query.page - 1) * query.limit;
    const conditions = [eq(orders.userId, userId)];
    if (query.status) conditions.push(eq(orders.status, query.status));

    const whereClause = and(...conditions);
    const [data, countResult] = await Promise.all([
      db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(query.limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause),
    ]);
    return { data, total: Number(countResult[0].count) };
  },

  async findAll(query: OrderQuery): Promise<{ data: Order[]; total: number }> {
    const offset = (query.page - 1) * query.limit;
    const conditions = query.status ? [eq(orders.status, query.status)] : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(query.limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause),
    ]);
    return { data, total: Number(countResult[0].count) };
  },

  async findById(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  },

  async findByRazorpayOrderId(razorpayOrderId: string): Promise<Order | undefined> {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.razorpayOrderId, razorpayOrderId))
      .limit(1);
    return result[0];
  },

  async create(data: NewOrder): Promise<Order> {
    const result = await db.insert(orders).values(data).returning();
    return result[0];
  },

  async createItems(items: NewOrderItem[]): Promise<OrderItem[]> {
    return db.insert(orderItems).values(items).returning();
  },

  async getItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  },

  async updateStatus(id: string, status: Order['status']): Promise<Order> {
    const result = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  },

  async markPaid(
    id: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<Order> {
    const result = await db
      .update(orders)
      .set({
        paymentStatus: 'paid',
        status: 'confirmed',
        razorpayPaymentId,
        razorpaySignature,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    return result[0];
  },

  async generateOrderNumber(): Promise<string> {
    const count = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const num = Number(count[0].count) + 1;
    return `PE-${new Date().getFullYear()}-${String(num).padStart(6, '0')}`;
  },

  async findAllAdmin(page: number, limit: number, search?: string, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): Promise<{ data: Order[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions = search
      ? [ilike(orders.orderNumber, `%${search}%`)]
      : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    let orderCol = orders.createdAt;
    if (sortBy === 'orderNumber') orderCol = orders.orderNumber as any;
    if (sortBy === 'total') orderCol = orders.total as any;
    if (sortBy === 'status') orderCol = orders.status as any;
    
    const orderClause = sortOrder === 'asc' ? asc(orderCol) : desc(orderCol);

    const [data, countResult] = await Promise.all([
      db.select().from(orders).where(whereClause).orderBy(orderClause).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(whereClause),
    ]);
    return { data, total: Number(countResult[0].count) };
  },

  async bulkDelete(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    await db.delete(orders).where(inArray(orders.id, ids));
  },
};
