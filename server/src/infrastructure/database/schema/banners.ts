import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

export const assetStatusEnum = pgEnum('asset_status', ['ready', 'quarantined']);
export const bannerPlacementEnum = pgEnum('banner_placement', ['home_hero']);
export const bannerContentModeEnum = pgEnum('banner_content_mode', ['artwork', 'overlay']);
export const bannerTextAlignmentEnum = pgEnum('banner_text_alignment', ['left', 'center', 'right']);
export const bannerContentPositionEnum = pgEnum('banner_content_position', [
  'top_left', 'top_center', 'top_right',
  'center_left', 'center', 'center_right',
  'bottom_left', 'bottom_center', 'bottom_right',
]);
export const bannerTextThemeEnum = pgEnum('banner_text_theme', ['light', 'dark']);

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: varchar('kind', { length: 40 }).default('banner').notNull(),
  status: assetStatusEnum('status').default('ready').notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull().unique(),
  url: varchar('url', { length: 1000 }).notNull(),
  mimeType: varchar('mime_type', { length: 80 }).notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  byteSize: integer('byte_size').notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('media_assets_kind_status_idx').on(table.kind, table.status, table.createdAt),
  check('media_assets_dimensions_check', sql`${table.width} > 0 AND ${table.height} > 0 AND ${table.byteSize} > 0`),
]);

export const banners = pgTable('banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  internalName: varchar('internal_name', { length: 120 }).notNull(),
  placement: bannerPlacementEnum('placement').default('home_hero').notNull(),
  contentMode: bannerContentModeEnum('content_mode').notNull(),
  desktopAssetId: uuid('desktop_asset_id').notNull().references(() => mediaAssets.id, { onDelete: 'restrict' }),
  mobileAssetId: uuid('mobile_asset_id').references(() => mediaAssets.id, { onDelete: 'restrict' }),
  desktopAltText: varchar('desktop_alt_text', { length: 240 }).default('').notNull(),
  mobileAltText: varchar('mobile_alt_text', { length: 240 }),
  accessibleLinkLabel: varchar('accessible_link_label', { length: 160 }),
  eyebrow: varchar('eyebrow', { length: 80 }),
  headline: varchar('headline', { length: 160 }),
  description: varchar('description', { length: 400 }),
  primaryCtaLabel: varchar('primary_cta_label', { length: 80 }),
  primaryCtaUrl: varchar('primary_cta_url', { length: 1000 }),
  bannerLinkUrl: varchar('banner_link_url', { length: 1000 }),
  openInNewTab: boolean('open_in_new_tab').default(false).notNull(),
  textAlignment: bannerTextAlignmentEnum('text_alignment').default('left').notNull(),
  desktopContentPosition: bannerContentPositionEnum('desktop_content_position').default('center_left').notNull(),
  mobileContentPosition: bannerContentPositionEnum('mobile_content_position').default('bottom_left').notNull(),
  textTheme: bannerTextThemeEnum('text_theme').default('light').notNull(),
  overlayStrength: integer('overlay_strength').default(45).notNull(),
  desktopFocalX: integer('desktop_focal_x').default(50).notNull(),
  desktopFocalY: integer('desktop_focal_y').default(50).notNull(),
  mobileFocalX: integer('mobile_focal_x').default(50).notNull(),
  mobileFocalY: integer('mobile_focal_y').default(50).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  version: integer('version').default(1).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('banners_public_visibility_idx').on(table.placement, table.isActive, table.archivedAt, table.sortOrder),
  index('banners_schedule_idx').on(table.placement, table.startsAt, table.endsAt),
  index('banners_updated_idx').on(table.updatedAt, table.id),
  check('banners_overlay_strength_check', sql`${table.overlayStrength} BETWEEN 0 AND 80`),
  check('banners_focal_points_check', sql`${table.desktopFocalX} BETWEEN 0 AND 100 AND ${table.desktopFocalY} BETWEEN 0 AND 100 AND ${table.mobileFocalX} BETWEEN 0 AND 100 AND ${table.mobileFocalY} BETWEEN 0 AND 100`),
  check('banners_schedule_check', sql`${table.startsAt} IS NULL OR ${table.endsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`),
  check('banners_version_check', sql`${table.version} > 0`),
]);

export const bannerSettings = pgTable('banner_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  placement: bannerPlacementEnum('placement').default('home_hero').notNull(),
  autoplayEnabled: boolean('autoplay_enabled').default(true).notNull(),
  autoplayIntervalMs: integer('autoplay_interval_ms').default(6000).notNull(),
  showNavigation: boolean('show_navigation').default(true).notNull(),
  showIndicators: boolean('show_indicators').default(true).notNull(),
  version: integer('version').default(1).notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('banner_settings_placement_uidx').on(table.placement),
  check('banner_settings_interval_check', sql`${table.autoplayIntervalMs} BETWEEN 3000 AND 15000`),
  check('banner_settings_version_check', sql`${table.version} > 0`),
]);

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type Banner = typeof banners.$inferSelect;
export type NewBanner = typeof banners.$inferInsert;
export type BannerSetting = typeof bannerSettings.$inferSelect;
