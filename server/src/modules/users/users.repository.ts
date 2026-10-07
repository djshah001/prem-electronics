import { eq, and, sql, inArray, ilike, or, desc, asc } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  users,
  addresses,
  type User,
  type Address,
  type NewAddress,
} from '../../infrastructure/database/schema/index.js';

export const usersRepository = {
  async findById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  },

  async updateProfile(
    id: string,
    data: Partial<Pick<User, 'name' | 'phone' | 'avatarUrl'>>
  ): Promise<User> {
    const result = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  },

  async getAddresses(userId: string): Promise<Address[]> {
    return db.select().from(addresses).where(eq(addresses.userId, userId));
  },

  async getAddressById(id: string, userId: string): Promise<Address | undefined> {
    const result = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .limit(1);
    return result[0];
  },

  async createAddress(data: NewAddress): Promise<Address> {
    const result = await db.insert(addresses).values(data).returning();
    return result[0];
  },

  async createAddressWithDefault(data: NewAddress): Promise<Address> {
    return db.transaction(async (tx) => {
      const existing = await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, data.userId));
      const makeDefault = data.isDefault || existing.length === 0;
      if (makeDefault) {
        await tx.update(addresses).set({ isDefault: false, updatedAt: new Date() }).where(eq(addresses.userId, data.userId));
      }
      const [address] = await tx.insert(addresses).values({ ...data, isDefault: makeDefault }).returning();
      return address;
    });
  },

  async updateAddress(
    id: string,
    userId: string,
    data: Partial<NewAddress>
  ): Promise<Address> {
    const result = await db
      .update(addresses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();
    return result[0];
  },

  async updateAddressWithDefault(id: string, userId: string, data: Partial<NewAddress>): Promise<Address | undefined> {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(addresses)
        .where(and(eq(addresses.id, id), eq(addresses.userId, userId))).limit(1);
      if (!existing) return undefined;
      if (data.isDefault) {
        await tx.update(addresses).set({ isDefault: false, updatedAt: new Date() }).where(eq(addresses.userId, userId));
      }
      const [address] = await tx.update(addresses).set({ ...data, updatedAt: new Date() })
        .where(and(eq(addresses.id, id), eq(addresses.userId, userId))).returning();
      return address;
    });
  },

  async deleteAddress(id: string, userId: string): Promise<void> {
    await db
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  },

  async clearDefaultAddresses(userId: string): Promise<void> {
    await db
      .update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.userId, userId));
  },

  async findAllAdmin(page: number, limit: number, search?: string, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): Promise<{ data: User[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions = search
      ? [or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!]
      : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    let orderCol = users.createdAt;
    if (sortBy === 'name') orderCol = users.name as any;
    if (sortBy === 'email') orderCol = users.email as any;
    if (sortBy === 'role') orderCol = users.role as any;
    
    const orderClause = sortOrder === 'asc' ? asc(orderCol) : desc(orderCol);

    const [data, countResult] = await Promise.all([
      db.select().from(users).where(whereClause).orderBy(orderClause).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(users).where(whereClause),
    ]);
    return { data, total: Number(countResult[0].count) };
  },

  async bulkDelete(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    await db.update(users)
      .set({ isBlocked: true, updatedAt: new Date() })
      .where(and(inArray(users.id, ids), eq(users.role, 'customer')));
  },

  async deleteAddressAndPromote(id: string, userId: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select().from(addresses)
        .where(and(eq(addresses.id, id), eq(addresses.userId, userId))).limit(1);
      if (!existing) return false;
      await tx.delete(addresses).where(eq(addresses.id, id));
      if (existing.isDefault) {
        const [replacement] = await tx.select({ id: addresses.id }).from(addresses)
          .where(eq(addresses.userId, userId)).orderBy(asc(addresses.createdAt)).limit(1);
        if (replacement) {
          await tx.update(addresses).set({ isDefault: true, updatedAt: new Date() }).where(eq(addresses.id, replacement.id));
        }
      }
      return true;
    });
  },
};
