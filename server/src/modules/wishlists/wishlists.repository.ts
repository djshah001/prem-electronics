import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { wishlists, products } from '../../infrastructure/database/schema/index.js';

export const wishlistsRepository = {
  async findByUser(userId: string) {
    return db
      .select({
        id: wishlists.id,
        productId: wishlists.productId,
        createdAt: wishlists.createdAt,
        product: {
          id: products.id,
          title: products.title,
          slug: products.slug,
          price: products.price,
          salePrice: products.salePrice,
          images: products.images,
          brand: products.brand,
          stock: products.stock,
          avgRating: products.avgRating,
          reviewCount: products.reviewCount,
          isActive: products.isActive,
        },
      })
      .from(wishlists)
      .leftJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.userId, userId))
      .orderBy(desc(wishlists.createdAt));
  },

  async findEntry(userId: string, productId: string) {
    const result = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
      .limit(1);
    return result[0];
  },

  async add(userId: string, productId: string) {
    const result = await db
      .insert(wishlists)
      .values({ userId, productId })
      .onConflictDoNothing()
      .returning();
    return result[0];
  },

  async remove(userId: string, productId: string) {
    await db
      .delete(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)));
  },
};
