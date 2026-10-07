import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, pool } from '../../infrastructure/database/db.js';
import { cartItems, carts, productVariants, products, users } from '../../infrastructure/database/schema/index.js';
import { cartRepository } from './cart.repository.js';

test('cart merge adds once per replay token and adds again for a new operation', async (t) => {
  const suffix = randomUUID();
  const [user] = await db.insert(users).values({ name: 'Cart integration', email: `cart-${suffix}@example.test`, passwordHash: 'not-a-real-password-hash', isVerified: true }).returning();
  const [product] = await db.insert(products).values({ title: 'Cart fixture', slug: `cart-fixture-${suffix}`, sku: `CART-${suffix}`, price: '100.00', stock: 5 }).returning();
  const [variant] = await db.insert(productVariants).values({ productId: product.id, sku: `CART-V-${suffix}`, price: '100.00', priceMinor: 10_000, stockQuantity: 5, optionCombinationKey: 'default' }).returning();

  t.after(async () => {
    await db.delete(products).where(eq(products.id, product.id));
    await db.delete(users).where(eq(users.id, user.id));
    await pool.end();
  });

  const token = randomUUID();
  const first = await cartRepository.mergeIdempotent(user.id, token, [{ productId: product.id, variantId: variant.id, quantity: 2 }]);
  const replay = await cartRepository.mergeIdempotent(user.id, token, [{ productId: product.id, variantId: variant.id, quantity: 2 }]);
  const secondOperation = await cartRepository.mergeIdempotent(user.id, randomUUID(), [{ productId: product.id, variantId: variant.id, quantity: 2 }]);
  const [cart] = await db.select().from(carts).where(eq(carts.userId, user.id));
  const [line] = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));

  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.equal(secondOperation.replayed, false);
  assert.equal(line.quantity, 4);
});
