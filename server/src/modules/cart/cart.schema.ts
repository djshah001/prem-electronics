import { z } from 'zod';

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(99),
  variantSnapshot: z.record(z.unknown()).optional(),
});

export const validateCartSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
  couponCode: z.string().optional(),
});

export const mergeCartSchema = z.object({
  items: z.array(cartItemSchema).max(100).default([]),
});

export const setCartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(99),
});
export const updateCartItemSchema = z.object({ quantity: z.number().int().min(1).max(99) });

export type CartItem = z.infer<typeof cartItemSchema>;
export type ValidateCartInput = z.infer<typeof validateCartSchema>;
