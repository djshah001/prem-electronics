import { eq, asc } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  navbarItems,
  type NavbarItem,
  type NewNavbarItem,
} from '../../infrastructure/database/schema/index.js';

export const navbarRepository = {
  /** Fetch all navbar items ordered by sortOrder */
  async findAll(): Promise<NavbarItem[]> {
    return db.select().from(navbarItems).orderBy(asc(navbarItems.sortOrder), asc(navbarItems.createdAt));
  },

  /** Fetch only visible items (for the public navbar) */
  async findVisible(): Promise<NavbarItem[]> {
    return db
      .select()
      .from(navbarItems)
      .where(eq(navbarItems.isVisible, true))
      .orderBy(asc(navbarItems.sortOrder), asc(navbarItems.createdAt));
  },

  async findById(id: string): Promise<NavbarItem | undefined> {
    const result = await db.select().from(navbarItems).where(eq(navbarItems.id, id)).limit(1);
    return result[0];
  },

  async create(data: NewNavbarItem): Promise<NavbarItem> {
    const result = await db.insert(navbarItems).values(data).returning();
    return result[0];
  },

  async update(id: string, data: Partial<NewNavbarItem>): Promise<NavbarItem | undefined> {
    const result = await db
      .update(navbarItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(navbarItems.id, id))
      .returning();
    return result[0];
  },

  async delete(id: string): Promise<void> {
    await db.delete(navbarItems).where(eq(navbarItems.id, id));
  },

  /** Bulk update sort orders.  Accepts [ { id, sortOrder } ] */
  async reorder(updates: { id: string; sortOrder: number }[]): Promise<void> {
    await Promise.all(
      updates.map(({ id, sortOrder }) =>
        db.update(navbarItems).set({ sortOrder, updatedAt: new Date() }).where(eq(navbarItems.id, id))
      )
    );
  },
};
