import { eq, isNull } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db';
import {
  categories,
  type Category,
  type NewCategory,
} from '../../infrastructure/database/schema/index';

export const categoriesRepository = {
  async findAll(): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.isActive, true));
  },

  async findRoots(): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(isNull(categories.parentId));
  },

  async findBySlug(slug: string): Promise<Category | undefined> {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);
    return result[0];
  },

  async findById(id: string): Promise<Category | undefined> {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return result[0];
  },

  async findChildren(parentId: string): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(eq(categories.parentId, parentId));
  },

  async create(data: NewCategory): Promise<Category> {
    const result = await db.insert(categories).values(data).returning();
    return result[0];
  },

  async update(id: string, data: Partial<NewCategory>): Promise<Category> {
    const result = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  },

  async delete(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  },
};
