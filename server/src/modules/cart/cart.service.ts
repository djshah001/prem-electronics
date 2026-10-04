import { productsRepository } from '../products/products.repository.js';
import { couponsRepository } from '../coupons/coupons.repository.js';
import { AppError } from '../../core/errors/appError.js';
import type { ValidateCartInput } from './cart.schema.js';
import { cartRepository } from './cart.repository.js';
import { NotFoundError } from '../../core/errors/appError.js';
import { env } from '../../config/env.js';
import { calculateGstPricing } from '../pricing/gstPricing.js';

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

  async mergeCart(userId: string, idempotencyToken: string, items: Array<{ productId: string; variantId?: string; quantity: number }>) {
    const deduplicated = new Map<string, { productId: string; variantId?: string; quantity: number }>();
    for (const item of items) {
      const key = item.variantId ?? item.productId;
      const existing = deduplicated.get(key);
      const qty = Math.min((existing?.quantity ?? 0) + item.quantity, 99);
      deduplicated.set(key, { productId: item.productId, variantId: item.variantId, quantity: qty });
    }
    const merge = await cartRepository.mergeIdempotent(userId, idempotencyToken, Array.from(deduplicated.values()));
    return { items: await this.getCart(userId), merge };
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
        let resolvedVariantId: string | null = item.variantId ?? null;

        const variantsData = await productsRepository.getOptionsAndVariants(item.productId);
        if (item.variantId || variantsData.variants.length > 0) {
          const variant = item.variantId
            ? variantsData.variants.find((v) => v.id === item.variantId)
            : variantsData.variants.find((v) => v.optionCombinationKey === 'default');
          if (!variant || !variant.isActive) {
            throw new AppError(`A valid purchasable variant is required for "${product.title}".`, 400);
          }
          if (variant.productId !== product.id) throw new AppError('Selected variant does not belong to this product.', 400);
          price = Number(variant.salePrice ?? variant.price);
          sku = variant.sku;
          availableStock = variant.stockQuantity;
          resolvedVariantId = variant.id;
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

        const category = await productsRepository.getCategorySnapshot(product.categoryId);

        return {
          productId: product.id,
          variantId: resolvedVariantId,
          title: product.title,
          categoryId: category.id,
          categoryName: category.name,
          image: (product.images as string[])?.[0] ?? null,
          quantity: item.quantity,
          unitPrice: price,
          unitPriceMinor: Math.round(price * 100),
          lineTotal: price * item.quantity,
          hsnCode: product.hsnCode ?? null,
          gstRateBps: product.gstRateBps ?? Math.round(env.TAX_RATE * 10_000),
          variantSnapshot: {
            sku,
            brand: product.brand,
            attributes: product.attributes,
            ...variantInfo,
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
    const shippingMinor = afterDiscount >= SHIPPING_THRESHOLD ? 0 : Math.round(SHIPPING_CHARGE * 100);
    const pricing = calculateGstPricing({
      lines: validatedItems.map((item) => ({ id: item.variantId ?? item.productId, quantity: item.quantity, unitPriceMinor: item.unitPriceMinor, gstRateBps: item.gstRateBps })),
      discountMinor: Math.round(discount * 100),
      shippingMinor,
      taxMode: env.TAX_MODE,
      supplierStateCode: env.SUPPLIER_STATE_CODE,
      placeOfSupplyStateCode: input.placeOfSupplyStateCode,
    });
    const pricedItems = validatedItems.map((item, index) => ({ ...item, ...pricing.lines[index] }));

    return {
      items: pricedItems,
      subtotal: pricing.subtotalMinor / 100,
      discount: pricing.discountMinor / 100,
      shipping: pricing.shippingMinor / 100,
      tax: pricing.taxMinor / 100,
      total: pricing.totalMinor / 100,
      amountMinor: pricing.totalMinor,
      taxBreakdown: {
        mode: env.TAX_MODE, policyVersion: env.PRICING_POLICY_VERSION, jurisdiction: pricing.jurisdiction,
        taxableMinor: pricing.taxableMinor, cgstMinor: pricing.cgstMinor, sgstMinor: pricing.sgstMinor,
        igstMinor: pricing.igstMinor, totalTaxMinor: pricing.taxMinor,
      },
      coupon: appliedCoupon
        ? { id: appliedCoupon.id, code: appliedCoupon.code }
        : null,
    };
  },
};
