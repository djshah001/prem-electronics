import { z } from 'zod';
import { isAllowedBlogImageSource } from './blogSanitizer.js';

const rejectRepeated = (value: unknown) => Array.isArray(value) ? { repeatedQueryParameter: true } : value;

const queryInteger = (fallback: number, max: number) => z.preprocess(
  rejectRepeated,
  z.coerce.number().int().min(1).max(max).default(fallback)
);

export const blogIdSchema = z.string().uuid();
export const blogSlugSchema = z.string().trim().min(2).max(300).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const blogAdminQuerySchema = z.object({
  page: queryInteger(1, 1_000_000),
  limit: queryInteger(20, 100),
  search: z.preprocess(rejectRepeated, z.string().trim().max(120).optional()),
  status: z.preprocess(rejectRepeated, z.enum(['draft', 'published', 'archived']).optional()),
  sortBy: z.preprocess(rejectRepeated, z.enum(['title', 'status', 'publishedAt', 'updatedAt', 'createdAt']).default('updatedAt')),
  sortOrder: z.preprocess(rejectRepeated, z.enum(['asc', 'desc']).default('desc')),
}).strict();

export const blogPublicQuerySchema = z.object({
  page: queryInteger(1, 1_000_000),
  limit: queryInteger(9, 100),
  search: z.preprocess(rejectRepeated, z.string().trim().max(120).optional()),
}).strict();

const blogFields = {
  title: z.string().trim().min(3).max(255),
  slug: blogSlugSchema,
  excerpt: z.string().trim().max(500).optional().nullable(),
  content: z.string().trim().min(1).max(250_000),
  imageUrl: z.string().trim().max(1000).refine((value) => isAllowedBlogImageSource(value), 'Cover image must use an approved HTTPS host or uploaded asset path.').optional().nullable(),
  coverAlt: z.string().trim().max(255).optional().nullable(),
  seoTitle: z.string().trim().max(255).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
};

export const createBlogSchema = z.object(blogFields).strict();
export const updateBlogSchema = z.object({
  ...Object.fromEntries(Object.entries(blogFields).map(([key, schema]) => [key, schema.optional()])),
  expectedVersion: z.number().int().min(1),
}).strict();

export const blogStateSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'archive', 'restore']),
  expectedVersion: z.number().int().min(1),
}).strict();

export const bulkArchiveBlogsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).transform((ids) => [...new Set(ids)]),
}).strict();

export type BlogAdminQuery = z.infer<typeof blogAdminQuerySchema>;
