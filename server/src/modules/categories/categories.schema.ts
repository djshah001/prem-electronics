import { z } from 'zod';
const singleQuery = (value: unknown) => Array.isArray(value) ? { repeatedQueryParameter: true } : value;

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  description: z.string().nullish().transform((v) => (v && v.trim() !== '' ? v.trim() : null)),
  bannerImage: z
    .string()
    .nullish()
    .refine(
      (v) => !v || v.trim() === '' || v.startsWith('/') || /^https?:\/\//.test(v),
      'Banner image must be a valid URL or path'
    )
    .transform((v) => (v && v.trim() !== '' ? v.trim() : null)),
  parentId: z
    .string()
    .nullish()
    .refine(
      (v) => !v || v.trim() === '' || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
      'Parent ID must be a valid UUID'
    )
    .transform((v) => (v && v.trim() !== '' ? v.trim() : null)),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryAdminQuerySchema = z.object({
  page: z.preprocess(singleQuery, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(singleQuery, z.coerce.number().int().min(1).max(100).default(20)),
  search: z.preprocess(singleQuery, z.string().trim().max(120).optional()),
  sortBy: z.preprocess(singleQuery, z.enum(['name', 'createdAt', 'isActive']).default('createdAt')),
  sortOrder: z.preprocess(singleQuery, z.enum(['asc', 'desc']).default('desc')),
}).strict();
export const categoryBulkSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100).transform((ids) => [...new Set(ids)]) }).strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
