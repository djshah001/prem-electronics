import { z } from 'zod';

const single = (value: unknown) => Array.isArray(value) ? { repeatedQueryParameter: true } : value;

export const createCouponSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  description: z.string().max(255).optional(),
  discountType: z.enum(['flat', 'percentage']),
  discountValue: z.number().positive(),
  minPurchase: z.number().min(0).default(0),
  maxDiscount: z.number().positive().nullish(),
  usageLimit: z.number().int().positive().nullish(),
  perUserLimit: z.number().int().positive().nullish(),
  firstOrderOnly: z.boolean().default(false),
  isActive: z.boolean().default(true),
  expiresAt: z.string().nullish().transform((value) => value ? new Date(value) : null),
});

export const updateCouponSchema = createCouponSchema.partial();

export const validateCouponSchema = z.object({
  code: z.string().min(1),
  cartTotal: z.number().positive(),
});

export const couponListQuerySchema = z.object({
  page: z.preprocess(single, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(single, z.coerce.number().int().min(1).max(100).default(20)),
  search: z.preprocess(single, z.string().trim().max(120).optional()),
  state: z.preprocess(single, z.enum(['active', 'inactive', 'expired']).optional()),
  sortBy: z.preprocess(single, z.enum(['code', 'createdAt', 'expiresAt', 'usedCount', 'isActive']).default('createdAt')),
  sortOrder: z.preprocess(single, z.enum(['asc', 'desc']).default('desc')),
}).strict();

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type CouponListQuery = z.infer<typeof couponListQuerySchema>;
