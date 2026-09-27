import { eq, and, gte, lte, ilike, or, sql, desc, asc } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db';
import {
  products,
  type Product,
  type NewProduct,
} from '../../infrastructure/database/schema/index';
import type { ProductQuery } from './products.schema';

export const productsRepository = {
  async findMany(query: ProductQuery): Promise<{ data: Product[]; total: number }> {
    const {
      page,
      limit,
      search,
      categoryId,
      minPrice,
      maxPrice,
      brand,
      minRating,
      inStock,
      isFeatured,
      isNewArrival,
      isBestSeller,
      sortBy,
    } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(products.isActive, true)];

    if (search) {
      conditions.push(
        or(
          ilike(products.title, `%${search}%`),
          ilike(products.description ?? sql`''`, `%${search}%`),
          ilike(products.brand ?? sql`''`, `%${search}%`)
        )!
      );
    }
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (minPrice !== undefined) conditions.push(gte(products.price, String(minPrice)));
    if (maxPrice !== undefined) conditions.push(lte(products.price, String(maxPrice)));
    if (brand) conditions.push(ilike(products.brand ?? sql`''`, `%${brand}%`));
    if (minRating !== undefined) conditions.push(gte(products.avgRating, String(minRating)));
    if (inStock) conditions.push(gte(products.stock, 1));
    if (isFeatured) conditions.push(eq(products.isFeatured, true));
    if (isNewArrival) conditions.push(eq(products.isNewArrival, true));
    if (isBestSeller) conditions.push(eq(products.isBestSeller, true));

    const whereClause = and(...conditions);

    let orderClause;
    switch (sortBy) {
      case 'price_asc': orderClause = asc(products.price); break;
      case 'price_desc': orderClause = desc(products.price); break;
      case 'rating': orderClause = desc(products.avgRating); break;
      case 'popular': orderClause = desc(products.reviewCount); break;
      default: orderClause = desc(products.createdAt);
    }

    const [data, countResult] = await Promise.all([
      db.select().from(products).where(whereClause).orderBy(orderClause).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause),
    ]);

    return { data, total: Number(countResult[0].count) };
  },

  async findBySlug(slug: string, activeOnly = true): Promise<Product | undefined> {
    const conditions = [eq(products.slug, slug)];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    const result = await db.select().from(products).where(and(...conditions)).limit(1);
    return result[0];
  },

  async findById(id: string, activeOnly = false): Promise<Product | undefined> {
    const conditions = [eq(products.id, id)];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    const result = await db.select().from(products).where(and(...conditions)).limit(1);
    return result[0];
  },

  async findBySku(sku: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
    return result[0];
  },

  async create(data: NewProduct): Promise<Product> {
    const result = await db.insert(products).values(data).returning();
    return result[0];
  },

  async update(id: string, data: Partial<NewProduct>): Promise<Product> {
    const result = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return result[0];
  },

  async decrementStock(id: string, quantity: number): Promise<void> {
    await db
      .update(products)
      .set({ stock: sql`${products.stock} - ${quantity}`, updatedAt: new Date() })
      .where(eq(products.id, id));
  },

  async updateRating(id: string, avgRating: number, reviewCount: number): Promise<void> {
    await db
      .update(products)
      .set({ avgRating: String(avgRating), reviewCount, updatedAt: new Date() })
      .where(eq(products.id, id));
  },

  async delete(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  },

  async softDelete(id: string): Promise<Product> {
    const result = await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return result[0];
  },

  async reactivate(id: string): Promise<Product> {
    const result = await db
      .update(products)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return result[0];
  },

  async findAllAdmin(page: number, limit: number, search?: string): Promise<{ data: Product[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions = search
      ? [or(ilike(products.title, `%${search}%`), ilike(products.sku, `%${search}%`))!]
      : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const [data, countResult] = await Promise.all([
      db.select().from(products).where(whereClause).orderBy(desc(products.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause),
    ]);
    return { data, total: Number(countResult[0].count) };
  },

  async findFeatured(limit = 8): Promise<Product[]> {
    return db.select().from(products)
      .where(and(eq(products.isFeatured, true), eq(products.isActive, true)))
      .orderBy(desc(products.createdAt))
      .limit(limit);
  },

  async findLowStock(threshold = 5): Promise<Product[]> {
    return db.select().from(products)
      .where(and(lte(products.stock, threshold), eq(products.isActive, true)))
      .orderBy(asc(products.stock));
  },
};
