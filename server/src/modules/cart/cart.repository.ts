import { and, eq, or, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { carts, cartItems, products, productVariants } from '../../infrastructure/database/schema/index.js';

type DatabaseExecutor = Parameters<Parameters<typeof db.transaction>[0]>[0];

const ensureCart = async (executor: typeof db | DatabaseExecutor, userId: string) => {
  await executor.insert(carts).values({ userId }).onConflictDoNothing({ target: carts.userId });
  const [cart] = await executor.select().from(carts).where(eq(carts.userId, userId)).limit(1);
  return cart;
};

export const cartRepository = {
  async getItems(userId: string) {
    const cart = await ensureCart(db, userId);
    return db.select({
      productId: products.id,
      variantId: cartItems.variantId,
      title: products.title,
      image: sql<string | null>`${products.images}->>0`,
      price: sql<string>`COALESCE(${productVariants.price}, ${products.price})`,
      salePrice: sql<string | null>`COALESCE(${productVariants.salePrice}, ${products.salePrice})`,
      quantity: cartItems.quantity,
      slug: products.slug,
      stock: sql<number>`COALESCE(${productVariants.stockQuantity}, ${products.stock})`,
      isActive: sql<boolean>`${products.isActive} AND COALESCE(${productVariants.isActive}, true)`,
      sku: sql<string>`COALESCE(${productVariants.sku}, ${products.sku})`,
      optionCombinationKey: productVariants.optionCombinationKey,
    }).from(cartItems)
      .innerJoin(products, eq(products.id, cartItems.productId))
      .leftJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(cartItems.createdAt);
  },

  async mergeIdempotent(userId: string, guestItems: Array<{ productId: string; variantId?: string; quantity: number }>) {
    await db.transaction(async (tx) => {
      const cart = await ensureCart(tx, userId);
      for (const item of guestItems) {
        const [product] = await tx.select({ id: products.id, stock: products.stock, isActive: products.isActive })
          .from(products).where(eq(products.id, item.productId)).limit(1);
        if (!product?.isActive || product.stock < 1) continue;

        let resolvedVariantId = item.variantId;
        let availableStock = product.stock;
        if (!resolvedVariantId) {
          const [defaultVar] = await tx.select({ id: productVariants.id, stock: productVariants.stockQuantity, isActive: productVariants.isActive })
            .from(productVariants)
            .where(and(eq(productVariants.productId, item.productId), eq(productVariants.optionCombinationKey, 'default')))
            .limit(1);
          if (defaultVar) {
            resolvedVariantId = defaultVar.id;
            if (!defaultVar.isActive || defaultVar.stock < 1) continue;
            availableStock = defaultVar.stock;
          }
        } else {
          const [variant] = await tx.select({ id: productVariants.id, stock: productVariants.stockQuantity, isActive: productVariants.isActive })
            .from(productVariants).where(eq(productVariants.id, resolvedVariantId)).limit(1);
          if (!variant || !variant.isActive || variant.stock < 1) continue;
          availableStock = variant.stock;
        }

        const condition = resolvedVariantId
          ? and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, resolvedVariantId))
          : and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, item.productId));

        const [existing] = await tx.select().from(cartItems).where(condition).limit(1);

        const quantity = Math.min(Math.max(existing?.quantity ?? 0, item.quantity), availableStock);
        if (existing) {
          await tx.update(cartItems).set({ quantity, updatedAt: new Date() }).where(eq(cartItems.id, existing.id));
        } else {
          await tx.insert(cartItems).values({ cartId: cart.id, productId: item.productId, variantId: resolvedVariantId ?? null, quantity });
        }
      }
      await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
    });
  },

  async setItem(userId: string, productId: string, quantity: number, variantId?: string) {
    await db.transaction(async (tx) => {
      const cart = await ensureCart(tx, userId);
      let resolvedVariantId = variantId;
      if (!resolvedVariantId) {
        const [defaultVar] = await tx.select({ id: productVariants.id })
          .from(productVariants)
          .where(and(eq(productVariants.productId, productId), eq(productVariants.optionCombinationKey, 'default')))
          .limit(1);
        resolvedVariantId = defaultVar?.id;
      }

      const condition = resolvedVariantId
        ? and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, resolvedVariantId))
        : and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, productId));

      const [existing] = await tx.select().from(cartItems).where(condition).limit(1);
      if (existing) {
        await tx.update(cartItems).set({ quantity, updatedAt: new Date() }).where(eq(cartItems.id, existing.id));
      } else {
        await tx.insert(cartItems).values({ cartId: cart.id, productId, variantId: resolvedVariantId ?? null, quantity });
      }
      await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
    });
  },

  async removeItem(userId: string, identifier: string) {
    const cart = await ensureCart(db, userId);
    await db.delete(cartItems).where(
      and(
        eq(cartItems.cartId, cart.id),
        or(eq(cartItems.productId, identifier), eq(cartItems.variantId, identifier), eq(cartItems.id, identifier))
      )
    );
    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  },

  async clear(userId: string) {
    const cart = await ensureCart(db, userId);
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  },
};
