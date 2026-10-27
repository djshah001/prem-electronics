import { z } from 'zod';

const navbarItemTypeValues = ['all_categories', 'category', 'custom_link'] as const;

export const createNavbarItemSchema = z.object({
  label: z.string().min(1).max(120),
  type: z.enum(navbarItemTypeValues),
  categoryId: z.string().uuid().nullish().transform((v) => v ?? null),
  href: z.string().max(500).nullish().transform((v) => (v && v.trim() !== '' ? v.trim() : null)),
  iconName: z.string().max(60).nullish().transform((v) => (v && v.trim() !== '' ? v.trim() : null)),
  sortOrder: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
});

export const updateNavbarItemSchema = createNavbarItemSchema.partial();

export const reorderNavbarSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    })
  ).min(1),
});

export type CreateNavbarItemInput = z.infer<typeof createNavbarItemSchema>;
export type UpdateNavbarItemInput = z.infer<typeof updateNavbarItemSchema>;
export type ReorderNavbarInput = z.infer<typeof reorderNavbarSchema>;
