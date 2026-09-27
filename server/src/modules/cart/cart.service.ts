import { productsRepository } from '../products/products.repository';
import { couponsRepository } from '../coupons/coupons.repository';
import { AppError } from '../../core/errors/appError';
import type { ValidateCartInput } from './cart.schema';

const SHIPPING_THRESHOLD = 999; // Free shipping above ₹999
const SHIPPING_CHARGE = 99;
const TAX_RATE = 0.18; // 18% GST

export const cartService = {
  async validateCart(input: ValidateCartInput) {
    const validatedItems = await Promise.all(
      input.items.map(async (item) => {
        const product = await productsRepository.findById(item.productId);
        if (!product) {
          throw new AppError(`Product not found: ${item.productId}`, 400);
        }
        if (!product.isActive) {
          throw new AppError(`"${product.title}" is no longer available.`, 400);
        }
        if (product.stock < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${product.title}". Only ${product.stock} left.`,
            400
          );
        }

        const price = Number(product.salePrice ?? product.price);
        return {
          productId: product.id,
          title: product.title,
          image: (product.images as string[])?.[0] ?? null,
          quantity: item.quantity,
          unitPrice: price,
          lineTotal: price * item.quantity,
          variantSnapshot: item.variantSnapshot ?? {},
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
