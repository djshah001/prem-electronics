import { z } from 'zod';

const optionalNullableText = (max: number) => z.string().max(max).nullish().transform((value) =>
  value === undefined ? undefined : (value && value.trim() !== '' ? value.trim() : null)
);

/**
 * Documented attribute shape: [{"name":"Material","value":"ABS"}, ...]
 * - Each row: name and value are nonempty trimmed strings, max 100 chars each.
 * - Max 50 attribute rows per product.
 * - Normalized names (lowercase trimmed) must be unique within the array.
 * - Accepts both the structured array AND the legacy {} record format for backwards compat during read;
 *   new writes always go through this validator.
 */
export const productAttributesSchema = z
  .array(
    z.object({
      name: z.string().min(1, 'Attribute name is required').max(100).transform((s) => s.trim()),
      value: z.string().min(1, 'Attribute value is required').max(100).transform((s) => s.trim()),
    })
  )
  .max(50, 'Maximum 50 attributes allowed')
  .superRefine((attrs, ctx) => {
    const seen = new Set<string>();
    attrs.forEach((attr, index) => {
      const normalized = attr.name.toLowerCase();
      if (seen.has(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'name'],
          message: `Duplicate attribute name: "${attr.name}". Attribute names must be unique.`,
        });
      }
      seen.add(normalized);
    });
  })
  .default([]);

export type ProductAttribute = { name: string; value: string };

export const createProductSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z.string().min(3).max(300).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  sku: z.string().min(2).max(100),
  description: z.string().nullish().transform((v) => (v && v.trim() !== '' ? v.trim() : null)),
  price: z.number().positive('Price must be positive'),
  salePrice: z.number().positive().nullish(),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  images: z.array(z.string().min(1).max(2048)).max(10).default([]),
  tags: z.array(z.string()).default([]),
  attributes: productAttributesSchema,
  barcode: z.string().max(100).nullish().transform((v) => (v && v.trim() !== '' ? v.trim() : null)),
  brand: z.string().max(100).nullish().transform((v) => (v && v.trim() !== '' ? v.trim() : null)),
  categoryId: z.string().uuid('A valid category is required.'),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
}).superRefine((value, ctx) => {
  if (value.salePrice != null && value.salePrice >= value.price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['salePrice'], message: 'Sale price must be lower than the regular price.' });
  }
});

export const updateProductSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  slug: z.string().min(3).max(300).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only').optional(),
  sku: z.string().min(2).max(100).optional(),
  description: optionalNullableText(10_000),
  price: z.number().positive('Price must be positive').optional(),
  salePrice: z.number().positive().nullish(),
  stock: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  images: z.array(z.string().min(1).max(2048)).max(10).optional(),
  tags: z.array(z.string()).optional(),
  attributes: productAttributesSchema.optional(),
  barcode: optionalNullableText(100),
  brand: optionalNullableText(100),
  categoryId: z.string().uuid('A valid category is required.').optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
});

export const productQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('12'),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.string().transform(Number).optional(),
  maxPrice: z.string().transform(Number).optional(),
  brand: z.string().optional(),
  minRating: z.string().transform(Number).optional(),
  inStock: z.string().transform((v) => v === 'true').optional(),
  isFeatured: z.string().transform((v) => v === 'true').optional(),
  isNewArrival: z.string().transform((v) => v === 'true').optional(),
  isBestSeller: z.string().transform((v) => v === 'true').optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'newest', 'rating', 'popular']).default('newest'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
