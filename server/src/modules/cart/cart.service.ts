import { productsRepository } from '../products/products.repository.js';
import { couponsRepository } from '../coupons/coupons.repository.js';
import { AppError } from '../../core/errors/appError.js';
import type { ValidateCartInput } from './cart.schema.js';
import { cartRepository } from './cart.repository.js';
import { NotFoundError } from '../../core/errors/appError.js';
import { env } from '../../config/env.js';

/** Pricing rules — configurable via environment. Defaults: 18% GST, ₹99 shipping, free >₹999 */
const SHIPPING_THRESHOLD = env.SHIPPING_FREE_THRESHOLD;
const SHIPPING_CHARGE = env.SHIPPING_CHARGE;
const TAX_RATE = env.TAX_RATE;


export const cartService = {
  async getCart(userId: string) {
    const items = await cartRepository.getItems(userId);
    return items.filter((item) => item.isActive && item.stock > 0).map(({ stock, isActive, ...item }) => ({
      ...item,
      quantity: Math.min(item.quantity, stock),
    }));
  },

  async mergeCart(userId: string, items: Array<{ productId: string; variantId?: string; quantity: number }>) {
    const deduplicated = new Map<string, { productId: string; variantId?: string; quantity: number }>();
    for (const item of items) {
      const key = item.variantId ?? item.productId;
      const existing = deduplicated.get(key);
      const qty = Math.min((existing?.quantity ?? 0) + item.quantity, 99);
      deduplicated.set(key, { productId: item.productId, variantId: item.variantId, quantity: qty });
    }
    await cartRepository.mergeIdempotent(userId, Array.from(deduplicated.values()));
    return this.getCart(userId);
  },

  async addItem(userId: string, productId: string, quantity: number, variantId?: string) {
    const product = await productsRepository.findById(productId, true);
    if (!product) throw new NotFoundError('Product is not available.');

    let availableStock = product.stock;
    if (variantId) {
      const variantsData = await productsRepository.getOptionsAndVariants(productId);
      const variant = variantsData.variants.find((v) => v.id === variantId);
      if (!variant || !variant.isActive) throw new NotFoundError('Selected variant is not available.');
      availableStock = variant.stockQuantity;
    }

    const currentItems = await cartRepository.getItems(userId);
    const existing = currentItems.find((item) =>
      variantId ? item.variantId === variantId : item.productId === productId
    );
    const current = existing?.quantity ?? 0;
    const nextQuantity = Math.min(current + quantity, availableStock);
    if (nextQuantity < 1) throw new AppError('Product or variant is out of stock.', 409);
    await cartRepository.setItem(userId, productId, nextQuantity, variantId);
    return this.getCart(userId);
  },

  async updateItem(userId: string, identifier: string, quantity: number) {
    const currentItems = await cartRepository.getItems(userId);
    const item = currentItems.find(
      (it) => it.productId === identifier || it.variantId === identifier
    );
    if (!item) throw new NotFoundError('Item not found in cart.');

    if (quantity > item.stock) throw new AppError(`Only ${item.stock} item(s) are available.`, 409);
    await cartRepository.setItem(userId, item.productId, quantity, item.variantId ?? undefined);
    return this.getCart(userId);
  },

  async removeItem(userId: string, productId: string) {
    await cartRepository.removeItem(userId, productId);
    return this.getCart(userId);
  },

  async clearCart(userId: string) {
    await cartRepository.clear(userId);
  },

  async validateCart(input: ValidateCartInput, userId?: string) {
    const validatedItems = await Promise.all(
      input.items.map(async (item) => {
        const product = await productsRepository.findById(item.productId);
        if (!product) {
          throw new AppError(`Product not found: ${item.productId}`, 400);
        }
        if (!product.isActive) {
          throw new AppError(`"${product.title}" is no longer available.`, 400);
        }

        let price = Number(product.salePrice ?? product.price);
        let sku = product.sku;
        let availableStock = product.stock;
        let variantInfo: Record<string, unknown> = {};

        if (item.variantId) {
          const variantsData = await productsRepository.getOptionsAndVariants(item.productId);
          const variant = variantsData.variants.find((v) => v.id === item.variantId);
          if (!variant || !variant.isActive) {
            throw new AppError(`Selected variant for "${product.title}" is no longer available.`, 400);
          }
          price = Number(variant.salePrice ?? variant.price);
          sku = variant.sku;
          availableStock = variant.stockQuantity;
          variantInfo = {
            variantId: variant.id,
            sku: variant.sku,
            optionCombinationKey: variant.optionCombinationKey,
          };
        }

        if (availableStock < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${product.title}" (${sku}). Only ${availableStock} left.`,
            400
          );
        }

        return {
          productId: product.id,
          variantId: item.variantId ?? null,
          title: product.title,
          image: (product.images as string[])?.[0] ?? null,
          quantity: item.quantity,
          unitPrice: price,
          lineTotal: price * item.quantity,
          variantSnapshot: {
            sku,
            brand: product.brand,
            attributes: product.attributes,
            ...variantInfo,
            ...(item.variantSnapshot ?? {}),
          },
        };
      })
    );

    const subtotal = validatedItems.reduce((sum, item) => sum + item.lineTotal, 0);

    // Coupon validation
    let discount = 0;
    let appliedCoupon = null;
    if (input.couponCode) {
      const coupon = await couponsRepository.findByCode(input.couponCode);
      if (!coupon || !coupon.isActive) {
        throw new AppError('Invalid or inactive coupon code.', 400);
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new AppError('This coupon has expired.', 400);
      }
      if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
        throw new AppError('This coupon has reached its usage limit.', 400);
      }
      if (coupon.firstOrderOnly || coupon.perUserLimit !== null) {
        if (!userId) throw new AppError('Sign in to use this coupon.', 401);
        if (coupon.firstOrderOnly && await couponsRepository.countPaidOrders(userId) > 0) {
          throw new AppError('This coupon is available only on your first order.', 400);
        }
        if (coupon.perUserLimit !== null && await couponsRepository.countUserRedemptions(coupon.id, userId) >= coupon.perUserLimit) {
          throw new AppError('You have already used this coupon the maximum number of times.', 400);
        }
      }
      const minPurchase = Number(coupon.minPurchase ?? 0);
      if (subtotal < minPurchase) {
        throw new AppError(
          `Minimum purchase of ₹${minPurchase.toFixed(2)} required to use this coupon.`,
          400
        );
      }

      if (coupon.discountType === 'flat') {
        discount = Number(coupon.discountValue);
      } else {
        discount = (subtotal * Number(coupon.discountValue)) / 100;
        if (coupon.maxDiscount) {
          discount = Math.min(discount, Number(coupon.maxDiscount));
        }
      }
      appliedCoupon = coupon;
    }

    const afterDiscount = Math.max(subtotal - discount, 0);
    const shipping = afterDiscount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
    const tax = afterDiscount * TAX_RATE;
    const total = afterDiscount + shipping + tax;

    return {
      items: validatedItems,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      shipping,
      tax: Number(tax.toFixed(2)),
      total: Number(total.toFixed(2)),
      coupon: appliedCoupon
        ? { id: appliedCoupon.id, code: appliedCoupon.code }
        : null,
    };
  },
};
