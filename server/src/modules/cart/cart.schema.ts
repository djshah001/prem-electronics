import { z } from 'zod';

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  variantSnapshot: z.record(z.unknown()).optional(),
});

export const validateCartSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
  couponCode: z.string().optional(),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type ValidateCartInput = z.infer<typeof validateCartSchema>;
