import { z } from 'zod';

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

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
