import { z } from 'zod';

const singleQuery = (value: unknown) => Array.isArray(value) ? { repeatedQueryParameter: true } : value;
const queryInt = (fallback: number, max: number) => z.preprocess(singleQuery, z.coerce.number().int().min(1).max(max).default(fallback));
const queryBoolean = z.preprocess(singleQuery, z.enum(['true', 'false']).transform((value) => value === 'true').optional());

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
  hsnCode: z.string().trim().min(4).max(20).optional(),
  gstRateBps: z.number().int().min(0).max(10_000).optional(),
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
  hsnCode: optionalNullableText(20),
  gstRateBps: z.number().int().min(0).max(10_000).nullable().optional(),
  categoryId: z.string().uuid('A valid category is required.').optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
});

export const productQuerySchema = z.object({
  page: queryInt(1, 1_000_000),
  limit: queryInt(12, 100),
  search: z.preprocess(singleQuery, z.string().trim().max(120).optional()),
  categoryId: z.preprocess(singleQuery, z.string().uuid().optional()),
  minPrice: z.preprocess(singleQuery, z.coerce.number().min(0).optional()),
  maxPrice: z.preprocess(singleQuery, z.coerce.number().min(0).optional()),
  brand: z.preprocess(singleQuery, z.string().trim().max(100).optional()),
  minRating: z.preprocess(singleQuery, z.coerce.number().min(0).max(5).optional()),
  inStock: queryBoolean,
  isFeatured: queryBoolean,
  isNewArrival: queryBoolean,
  isBestSeller: queryBoolean,
  sortBy: z.preprocess(singleQuery, z.enum(['price_asc', 'price_desc', 'newest', 'rating', 'popular']).default('newest')),
}).strict().superRefine((value, ctx) => {
  if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['minPrice'], message: 'Minimum price cannot exceed maximum price.' });
  }
});

export const productAdminQuerySchema = z.object({
  page: queryInt(1, 1_000_000), limit: queryInt(20, 100),
  search: z.preprocess(singleQuery, z.string().trim().max(120).optional()),
  sortBy: z.preprocess(singleQuery, z.enum(['createdAt', 'title', 'price', 'stock', 'isActive']).default('createdAt')),
  sortOrder: z.preprocess(singleQuery, z.enum(['asc', 'desc']).default('desc')),
  isActive: queryBoolean,
  categoryId: z.preprocess(singleQuery, z.string().uuid().optional()),
}).strict();

export const productBulkSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100).transform((ids) => [...new Set(ids)]) }).strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type ProductAdminQuery = z.infer<typeof productAdminQuerySchema>;
