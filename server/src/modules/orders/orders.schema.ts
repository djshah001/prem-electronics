import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    quantity: z.number().int().positive(),
  })).min(1),
  shippingAddressId: z.string().uuid().optional(),
  shippingAddress: z.object({
    fullName: z.string(),
    phone: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    pincode: z.string(),
    country: z.string().default('India'),
  }).optional(),
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
  purchaseType: z.enum(['personal', 'company']).default('personal'),
  businessProfileId: z.string().uuid().optional(),
  authorizedRepresentative: z.literal(true).optional(),
  purchaseOrderReference: z.string().trim().max(100).optional(),
  taxScenario: z.literal('ordinary_goods_movement').default('ordinary_goods_movement'),
}).refine(
  (data) => data.shippingAddressId || data.shippingAddress,
  { message: 'Either shippingAddressId or shippingAddress is required.' }
).superRefine((data, ctx) => {
  if (data.purchaseType === 'company') {
    if (!data.businessProfileId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['businessProfileId'], message: 'Select a verified business profile.' });
    if (data.authorizedRepresentative !== true) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['authorizedRepresentative'], message: 'Authorization acknowledgement is required.' });
  }
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
});

export const orderQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
