import { z } from 'zod';

export const bannerPlacementSchema = z.enum(['home_hero']);
export const bannerContentModeSchema = z.enum(['artwork', 'overlay']);
export const bannerContentPositionSchema = z.enum([
  'top_left', 'top_center', 'top_right',
  'center_left', 'center', 'center_right',
  'bottom_left', 'bottom_center', 'bottom_right',
]);

const optionalText = (max: number) => z.string().trim().max(max).nullish()
  .transform((value) => value && value.length > 0 ? value : null);

export const safeBannerUrlSchema = z.string().trim().min(1).max(1000).superRefine((value, ctx) => {
  if (/^[\u0000-\u001f\u007f]/.test(value) || /[\u0000-\u001f\u007f]/.test(value)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'URL cannot contain control characters.' });
    return;
  }
  if (value.startsWith('/') && !value.startsWith('//')) return;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'External URLs must use HTTPS.' });
    }
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use a site-relative path or a valid HTTPS URL.' });
  }
});

const nullableUrl = z.union([safeBannerUrlSchema, z.literal(''), z.null(), z.undefined()])
  .transform((value) => value || null);
const nullableInstant = z.union([z.string().datetime({ offset: true }), z.date(), z.literal(''), z.null(), z.undefined()])
  .transform((value) => value instanceof Date ? value : value ? new Date(value) : null);

export const bannerFieldsSchema = z.object({
  internalName: z.string().trim().min(2).max(120),
  placement: bannerPlacementSchema.default('home_hero'),
  contentMode: bannerContentModeSchema,
  desktopAssetId: z.string().uuid(),
  mobileAssetId: z.string().uuid().nullable().optional().transform((value) => value || null),
  desktopAltText: z.string().trim().max(240).default(''),
  mobileAltText: optionalText(240),
  accessibleLinkLabel: optionalText(160),
  eyebrow: optionalText(80),
  headline: optionalText(160),
  description: optionalText(400),
  primaryCtaLabel: optionalText(80),
  primaryCtaUrl: nullableUrl,
  bannerLinkUrl: nullableUrl,
  openInNewTab: z.boolean().default(false),
  textAlignment: z.enum(['left', 'center', 'right']).default('left'),
  desktopContentPosition: bannerContentPositionSchema.default('center_left'),
  mobileContentPosition: bannerContentPositionSchema.default('bottom_left'),
  textTheme: z.enum(['light', 'dark']).default('light'),
  overlayStrength: z.number().int().min(0).max(80).default(45),
  desktopFocalX: z.number().int().min(0).max(100).default(50),
  desktopFocalY: z.number().int().min(0).max(100).default(50),
  mobileFocalX: z.number().int().min(0).max(100).default(50),
  mobileFocalY: z.number().int().min(0).max(100).default(50),
  isActive: z.boolean().default(false),
  startsAt: nullableInstant,
  endsAt: nullableInstant,
}).strict();

export const bannerPayloadSchema = bannerFieldsSchema.superRefine((value, ctx) => {
  if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'End time must be after start time.' });
  }
  if ((value.primaryCtaLabel === null) !== (value.primaryCtaUrl === null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['primaryCtaLabel'], message: 'CTA label and URL must be supplied together.' });
  }
  if (value.contentMode === 'artwork') {
    if (value.desktopAltText.length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['desktopAltText'], message: 'Artwork banners need a meaningful image description.' });
    }
    if (value.bannerLinkUrl && (!value.accessibleLinkLabel || value.accessibleLinkLabel.length < 3)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accessibleLinkLabel'], message: 'Linked artwork needs an accessible link label.' });
    }
    if (value.primaryCtaLabel || value.primaryCtaUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['primaryCtaLabel'], message: 'Artwork mode uses the banner link instead of an overlay CTA.' });
    }
  } else if (value.bannerLinkUrl || value.accessibleLinkLabel) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bannerLinkUrl'], message: 'Overlay mode uses the CTA fields instead of a whole-banner link.' });
  }
});

export const createBannerSchema = bannerPayloadSchema;
export const updateBannerSchema = bannerFieldsSchema.partial().extend({
  expectedVersion: z.number().int().positive(),
}).strict();
export const bannerIdSchema = z.string().uuid();

const singleQuery = (value: unknown) => Array.isArray(value) ? { repeated: true } : value;
export const bannerAdminQuerySchema = z.object({
  page: z.preprocess(singleQuery, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(singleQuery, z.coerce.number().int().min(1).max(100).default(20)),
  search: z.preprocess(singleQuery, z.string().trim().max(120).optional()),
  placement: z.preprocess(singleQuery, bannerPlacementSchema.default('home_hero')),
  visibility: z.preprocess(singleQuery, z.enum(['all', 'inactive', 'scheduled', 'visible', 'expired', 'archived']).default('all')),
  sortBy: z.preprocess(singleQuery, z.enum(['sortOrder', 'internalName', 'updatedAt', 'createdAt']).default('sortOrder')),
  sortOrder: z.preprocess(singleQuery, z.enum(['asc', 'desc']).default('asc')),
}).strict();

export const reorderBannersSchema = z.object({
  placement: bannerPlacementSchema,
  items: z.array(z.object({ id: z.string().uuid(), expectedVersion: z.number().int().positive() }).strict()).min(1).max(200),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.items.map((item) => item.id)).size !== value.items.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Banner IDs must be unique.' });
  }
});

export const bannerSettingsSchema = z.object({
  autoplayEnabled: z.boolean(),
  autoplayIntervalMs: z.number().int().min(3000).max(15000),
  showNavigation: z.boolean(),
  showIndicators: z.boolean(),
  expectedVersion: z.number().int().positive(),
}).strict();

export type BannerFields = z.infer<typeof bannerFieldsSchema>;
export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export type BannerAdminQuery = z.infer<typeof bannerAdminQuerySchema>;
