import { eq, isNull, sql, inArray, or, ilike, and, desc, asc } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  categories,
  products,
  type Category,
  type NewCategory,
} from '../../infrastructure/database/schema/index.js';

export const categoriesRepository = {
  async findAll(): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.isActive, true));
  },

  async findAllIncludingArchived(): Promise<Category[]> {
    return db.select().from(categories);
  },

  async findRoots(): Promise<Category[]> {
    return db
      .select()
      .from(categories)
      .where(isNull(categories.parentId));
  },

  async findBySlug(slug: string, activeOnly = false): Promise<Category | undefined> {
    const result = await db
      .select()
      .from(categories)
      .where(activeOnly ? and(eq(categories.slug, slug), eq(categories.isActive, true)) : eq(categories.slug, slug))
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

  async archive(id: string): Promise<Category | undefined> {
    const result = await db.update(categories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  },

  async getArchiveBlockers(id: string): Promise<{ activeProducts: number; activeChildren: number }> {
    const [productCount, childCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(products)
        .where(and(eq(products.categoryId, id), eq(products.isActive, true))),
      db.select({ count: sql<number>`count(*)` }).from(categories)
        .where(and(eq(categories.parentId, id), eq(categories.isActive, true))),
    ]);
    return {
      activeProducts: Number(productCount[0].count),
      activeChildren: Number(childCount[0].count),
    };
  },

  async findAllAdmin(page: number, limit: number, search?: string, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): Promise<{ data: Category[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions = search
      ? [ilike(categories.name, `%${search}%`)]
      : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    let orderCol = categories.createdAt;
    if (sortBy === 'name') orderCol = categories.name as any;
    if (sortBy === 'isActive') orderCol = categories.isActive as any;
    
    const orderClause = sortOrder === 'asc' ? asc(orderCol) : desc(orderCol);

    const [data, countResult] = await Promise.all([
      db.select().from(categories).where(whereClause).orderBy(orderClause, desc(categories.id)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(categories).where(whereClause),
    ]);
    return { data, total: Number(countResult[0].count) };
  },

  async bulkDelete(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    await db.update(categories)
      .set({ isActive: false, updatedAt: new Date() })
      .where(inArray(categories.id, ids));
  },
};
