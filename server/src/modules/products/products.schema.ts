import { z } from 'zod';

export const createProductSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z.string().min(3).max(300).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  sku: z.string().min(2).max(100),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  salePrice: z.number().positive().optional(),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  images: z.array(z.string().url()).default([]),
  tags: z.array(z.string()).default([]),
  attributes: z.record(z.unknown()).default({}),
  barcode: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.partial();

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
