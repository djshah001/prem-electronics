import { z } from 'zod';
import { isValidGstin, normalizeGstin } from '../../infrastructure/gst/gstin.js';

export const gstinSchema = z.string().transform(normalizeGstin).refine(isValidGstin, 'Invalid GSTIN format or checksum.');

export const businessAddressSchema = z.object({
  building: z.string().trim().max(150).optional(),
  street: z.string().trim().max(255).optional(),
  locality: z.string().trim().max(150).optional(),
  city: z.string().trim().min(2).max(100),
  district: z.string().trim().max(100).optional(),
  state: z.string().trim().min(2).max(100),
  stateCode: z.string().regex(/^\d{2}$/, 'State code must contain two digits.'),
  pincode: z.string().regex(/^\d{6}$/, 'PIN code must contain six digits.'),
  country: z.string().trim().default('India'),
  source: z.enum(['provider', 'customer']).default('customer'),
});

export const gstLookupSchema = z.object({ gstin: gstinSchema });
export const businessIdSchema = z.string().uuid('Invalid business profile ID.');

export const createBusinessSchema = z.object({
  verificationId: z.string().uuid(),
  nickname: z.string().trim().max(100).optional(),
  billingAddress: businessAddressSchema,
  contactPerson: z.string().trim().max(100).optional(),
  contactPhone: z.string().trim().min(10).max(20).optional(),
  contactEmail: z.string().email().optional(),
  isDefault: z.boolean().default(false),
});

export const updateBusinessSchema = z.object({
  version: z.number().int().positive(),
  nickname: z.string().trim().max(100).nullable().optional(),
  billingAddress: businessAddressSchema.optional(),
  contactPerson: z.string().trim().max(100).nullable().optional(),
  contactPhone: z.string().trim().min(10).max(20).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
