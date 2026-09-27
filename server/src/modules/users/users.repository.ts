import { eq, and } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db';
import {
  users,
  addresses,
  type User,
  type Address,
  type NewAddress,
} from '../../infrastructure/database/schema/index';

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
};
