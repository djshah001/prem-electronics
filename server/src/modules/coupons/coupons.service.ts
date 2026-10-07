import { couponsRepository } from './coupons.repository.js';
import { AppError, NotFoundError, ConflictError } from '../../core/errors/appError.js';
import type { CouponListQuery, CreateCouponInput, UpdateCouponInput, ValidateCouponInput } from './coupons.schema.js';
import { buildPaginationMeta } from '../../core/utils/responseHandler.js';

export const couponsService = {
  async getAll(query: CouponListQuery) {
    const { data, total } = await couponsRepository.findAll(query);
    return { data, meta: buildPaginationMeta(query.page, query.limit, total) };
  },

  async validate(input: ValidateCouponInput) {
    const coupon = await couponsRepository.findByCode(input.code);
    if (!coupon || !coupon.isActive) throw new AppError('Invalid or inactive coupon code.', 400);
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError('This coupon has expired.', 400);
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new AppError('Coupon usage limit reached.', 400);

    const minPurchase = Number(coupon.minPurchase ?? 0);
    if (input.cartTotal < minPurchase) {
      throw new AppError(`Minimum cart total of ₹${minPurchase} required.`, 400);
    }

    let discount = 0;
    if (coupon.discountType === 'flat') {
      discount = Number(coupon.discountValue);
    } else {
      discount = (input.cartTotal * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
    }

    return { coupon, discount: Number(discount.toFixed(2)) };
  },

  async create(input: CreateCouponInput) {
    const existing = await couponsRepository.findByCode(input.code);
    if (existing) throw new ConflictError('A coupon with this code already exists.');
    return couponsRepository.create({
      ...input,
      discountValue: String(input.discountValue),
      minPurchase: String(input.minPurchase),
      maxDiscount: input.maxDiscount ? String(input.maxDiscount) : null,
    });
  },

  async update(id: string, input: UpdateCouponInput) {
    const existing = await couponsRepository.findById(id);
    if (!existing) throw new NotFoundError('Coupon not found.');
    return couponsRepository.update(id, {
      ...input,
      discountValue: input.discountValue ? String(input.discountValue) : undefined,
      minPurchase: input.minPurchase !== undefined ? String(input.minPurchase) : undefined,
      maxDiscount: input.maxDiscount === undefined ? undefined : (input.maxDiscount === null ? null : String(input.maxDiscount)),
    });
  },

  async delete(id: string) {
    const existing = await couponsRepository.findById(id);
    if (!existing) throw new NotFoundError('Coupon not found.');
    await couponsRepository.delete(id);
  },
};
