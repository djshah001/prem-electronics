import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { bannerSettings, banners, contentAuditEvents, mediaAssets, type Banner } from '../../infrastructure/database/schema/index.js';
import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../../core/errors/appError.js';
import { buildPaginationMeta } from '../../core/utils/responseHandler.js';
import { bannersRepository } from './banners.repository.js';
import { bannerPayloadSchema, type BannerAdminQuery, type CreateBannerInput, type UpdateBannerInput } from './banners.schema.js';
import type { UserRole } from '../../core/middlewares/authGuard.js';

const PUBLIC_CACHE_MS = 30_000;
const MAX_ACTIVE_HOME_HERO = 10;
let publicCache: { expiresAt: number; value: PublicBannerResponse } | null = null;

export const bannerVisibility = (banner: Pick<Banner, 'isActive' | 'archivedAt' | 'startsAt' | 'endsAt'>, now = new Date()) => {
  if (banner.archivedAt) return 'archived' as const;
  if (!banner.isActive) return 'inactive' as const;
  if (banner.startsAt && banner.startsAt > now) return 'scheduled' as const;
  if (banner.endsAt && banner.endsAt <= now) return 'expired' as const;
  return 'visible' as const;
};

const bannerFields = (banner: Banner) => ({
  internalName: banner.internalName,
  placement: banner.placement,
  contentMode: banner.contentMode,
  desktopAssetId: banner.desktopAssetId,
  mobileAssetId: banner.mobileAssetId,
  desktopAltText: banner.desktopAltText,
  mobileAltText: banner.mobileAltText,
  accessibleLinkLabel: banner.accessibleLinkLabel,
  eyebrow: banner.eyebrow,
  headline: banner.headline,
  description: banner.description,
  primaryCtaLabel: banner.primaryCtaLabel,
  primaryCtaUrl: banner.primaryCtaUrl,
  bannerLinkUrl: banner.bannerLinkUrl,
  openInNewTab: banner.openInNewTab,
  textAlignment: banner.textAlignment,
  desktopContentPosition: banner.desktopContentPosition,
  mobileContentPosition: banner.mobileContentPosition,
  textTheme: banner.textTheme,
  overlayStrength: banner.overlayStrength,
  desktopFocalX: banner.desktopFocalX,
  desktopFocalY: banner.desktopFocalY,
  mobileFocalX: banner.mobileFocalX,
  mobileFocalY: banner.mobileFocalY,
  isActive: banner.isActive,
  startsAt: banner.startsAt,
  endsAt: banner.endsAt,
});

const validateAssets = async (desktopId: string, mobileId: string | null, actorId: string, role: UserRole) => {
  const ids = [desktopId, mobileId].filter(Boolean) as string[];
  const assets = await bannersRepository.findAssets(ids);
  if (assets.length !== new Set(ids).size) throw new AppError('One or more selected image assets do not exist.', 422);
  for (const asset of assets) {
    if (asset.kind !== 'banner' || asset.status !== 'ready' || !asset.mimeType.startsWith('image/')) {
      throw new AppError('Only ready banner image assets can be attached.', 422);
    }
    if (asset.uploadedBy && asset.uploadedBy !== actorId && role !== 'superadmin') {
      throw new ForbiddenError('You can only attach banner assets uploaded by your account.');
    }
  }
};

const hydrate = async (records: Banner[]) => {
  const assets = await bannersRepository.findAssets(records.flatMap((banner) => [banner.desktopAssetId, banner.mobileAssetId].filter(Boolean) as string[]));
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const now = new Date();
  return records.map((banner) => ({
    ...banner,
    desktopAsset: byId.get(banner.desktopAssetId),
    mobileAsset: banner.mobileAssetId ? byId.get(banner.mobileAssetId) ?? null : null,
    visibility: bannerVisibility(banner, now),
  }));
};

type PublicBannerResponse = Awaited<ReturnType<typeof buildPublicResponse>>;
async function buildPublicResponse() {
  const now = new Date();
  const [records, settings, boundary] = await Promise.all([
    bannersRepository.listPublic('home_hero', now),
    bannersRepository.settings('home_hero'),
    bannersRepository.nextBoundary('home_hero', now),
  ]);
  const hydrated = await hydrate(records);
  const freshUntil = new Date(Math.min(now.getTime() + PUBLIC_CACHE_MS, boundary?.getTime() ?? Number.POSITIVE_INFINITY));
  return {
    banners: hydrated.map(({ desktopAsset, mobileAsset, visibility: _visibility, ...banner }) => ({
      id: banner.id,
      contentMode: banner.contentMode,
      desktopAsset: desktopAsset ? { url: desktopAsset.url, width: desktopAsset.width, height: desktopAsset.height } : null,
      mobileAsset: mobileAsset ? { url: mobileAsset.url, width: mobileAsset.width, height: mobileAsset.height } : null,
      desktopAltText: banner.desktopAltText,
      mobileAltText: banner.mobileAltText,
      accessibleLinkLabel: banner.accessibleLinkLabel,
      eyebrow: banner.eyebrow,
      headline: banner.headline,
      description: banner.description,
      primaryCtaLabel: banner.primaryCtaLabel,
      primaryCtaUrl: banner.primaryCtaUrl,
      bannerLinkUrl: banner.bannerLinkUrl,
      openInNewTab: banner.openInNewTab,
      textAlignment: banner.textAlignment,
      desktopContentPosition: banner.desktopContentPosition,
      mobileContentPosition: banner.mobileContentPosition,
      textTheme: banner.textTheme,
      overlayStrength: banner.overlayStrength,
      desktopFocalX: banner.desktopFocalX,
      desktopFocalY: banner.desktopFocalY,
      mobileFocalX: banner.mobileFocalX,
      mobileFocalY: banner.mobileFocalY,
    })),
    settings: {
      autoplayEnabled: settings.autoplayEnabled,
      autoplayIntervalMs: settings.autoplayIntervalMs,
      showNavigation: settings.showNavigation,
      showIndicators: settings.showIndicators,
    },
    serverTime: now.toISOString(),
    freshUntil: freshUntil.toISOString(),
  };
}

const invalidate = () => { publicCache = null; };

export const bannersService = {
  async publicList() {
    if (publicCache && publicCache.expiresAt > Date.now()) return publicCache.value;
    const value = await buildPublicResponse();
    publicCache = { value, expiresAt: new Date(value.freshUntil).getTime() };
    return value;
  },

  async adminList(query: BannerAdminQuery) {
    const result = await bannersRepository.listAdmin(query, new Date());
    return {
      data: await hydrate(result.data),
      meta: { ...buildPaginationMeta(query.page, query.limit, result.total), counts: result.counts },
    };
  },

  async orderList(placement: 'home_hero') {
    return hydrate(await bannersRepository.listForOrdering(placement));
  },

  async detail(id: string) {
    const banner = await bannersRepository.findById(id);
    if (!banner) throw new NotFoundError('Banner not found.');
    return (await hydrate([banner]))[0];
  },

  async create(input: CreateBannerInput, actorId: string, role: UserRole) {
    await validateAssets(input.desktopAssetId, input.mobileAssetId, actorId, role);
    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('banner-active-home_hero'))`);
      if (input.isActive) {
        const count = await tx.select({ value: sql<number>`count(*)` }).from(banners)
          .where(and(eq(banners.placement, input.placement), eq(banners.isActive, true), isNull(banners.archivedAt)));
        if (Number(count[0].value) >= MAX_ACTIVE_HOME_HERO) throw new ConflictError(`A maximum of ${MAX_ACTIVE_HOME_HERO} active home hero banners is allowed.`);
      }
      const maximum = await tx.select({ value: sql<number>`coalesce(max(${banners.sortOrder}), -1)` }).from(banners)
        .where(and(eq(banners.placement, input.placement), isNull(banners.archivedAt)));
      const [record] = await tx.insert(banners).values({ ...input, sortOrder: Number(maximum[0].value) + 1, createdBy: actorId, updatedBy: actorId }).returning();
      await tx.insert(contentAuditEvents).values({ entityType: 'banner', entityId: record.id, action: 'created', actorId, metadata: { placement: record.placement, active: record.isActive } });
      return record;
    });
    invalidate();
    return (await hydrate([created]))[0];
  },

  async update(id: string, input: UpdateBannerInput, actorId: string, role: UserRole) {
    const existing = await bannersRepository.findById(id);
    if (!existing) throw new NotFoundError('Banner not found.');
    if (existing.archivedAt) throw new ConflictError('Archived banners cannot be edited.');
    const { expectedVersion, ...changes } = input;
    const validated = bannerPayloadSchema.parse({ ...bannerFields(existing), ...changes });
    await validateAssets(validated.desktopAssetId, validated.mobileAssetId, actorId, role);
    const updated = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('banner-active-home_hero'))`);
      if (validated.isActive && !existing.isActive) {
        const count = await tx.select({ value: sql<number>`count(*)` }).from(banners)
          .where(and(eq(banners.placement, validated.placement), eq(banners.isActive, true), isNull(banners.archivedAt)));
        if (Number(count[0].value) >= MAX_ACTIVE_HOME_HERO) throw new ConflictError(`A maximum of ${MAX_ACTIVE_HOME_HERO} active home hero banners is allowed.`);
      }
      const [record] = await tx.update(banners).set({ ...validated, updatedBy: actorId, updatedAt: new Date(), version: sql`${banners.version} + 1` })
        .where(and(eq(banners.id, id), eq(banners.version, expectedVersion), isNull(banners.archivedAt))).returning();
      if (!record) throw new ConflictError('This banner changed in another session. Reload and try again.');
      await tx.insert(contentAuditEvents).values({ entityType: 'banner', entityId: id, action: 'updated', actorId, metadata: { previousVersion: expectedVersion, active: record.isActive } });
      return record;
    });
    invalidate();
    return (await hydrate([updated]))[0];
  },

  async archive(id: string, expectedVersion: number, actorId: string) {
    const [archived] = await db.update(banners).set({ isActive: false, archivedAt: new Date(), updatedAt: new Date(), updatedBy: actorId, version: sql`${banners.version} + 1` })
      .where(and(eq(banners.id, id), eq(banners.version, expectedVersion), isNull(banners.archivedAt))).returning();
    if (!archived) {
      if (!await bannersRepository.findById(id)) throw new NotFoundError('Banner not found.');
      throw new ConflictError('This banner changed in another session or is already archived.');
    }
    await db.insert(contentAuditEvents).values({ entityType: 'banner', entityId: id, action: 'archived', actorId, metadata: {} });
    invalidate();
    return archived;
  },

  async reorder(placement: 'home_hero', items: Array<{ id: string; expectedVersion: number }>, actorId: string) {
    const reordered = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`banner-reorder-${placement}`}))`);
      const current = await tx.select().from(banners).where(and(eq(banners.placement, placement), isNull(banners.archivedAt)))
        .orderBy(asc(banners.sortOrder), asc(banners.id));
      const expectedIds = current.map((banner) => banner.id).sort();
      const submittedIds = items.map((item) => item.id).sort();
      if (expectedIds.length !== submittedIds.length || expectedIds.some((id, index) => id !== submittedIds[index])) {
        throw new ConflictError('Ordering must include every current unarchived banner for this placement. Reload and try again.');
      }
      const versions = new Map(current.map((banner) => [banner.id, banner.version]));
      if (items.some((item) => versions.get(item.id) !== item.expectedVersion)) {
        throw new ConflictError('One or more banners changed in another session. Reload and try again.');
      }
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const result = await tx.update(banners).set({ sortOrder: index, updatedAt: new Date(), updatedBy: actorId, version: sql`${banners.version} + 1` })
          .where(and(eq(banners.id, item.id), eq(banners.version, item.expectedVersion))).returning({ id: banners.id });
        if (!result.length) throw new ConflictError('Banner ordering conflicted with another update.');
      }
      await tx.insert(contentAuditEvents).values(items.map((item, index) => ({ entityType: 'banner', entityId: item.id, action: 'reordered', actorId, metadata: { sortOrder: index } })));
      return tx.select().from(banners).where(inArray(banners.id, items.map((item) => item.id))).orderBy(asc(banners.sortOrder), asc(banners.id));
    });
    invalidate();
    return hydrate(reordered);
  },

  getSettings: () => bannersRepository.settings('home_hero'),

  async updateSettings(input: { autoplayEnabled: boolean; autoplayIntervalMs: number; showNavigation: boolean; showIndicators: boolean; expectedVersion: number }, actorId: string) {
    await bannersRepository.settings('home_hero');
    const [updated] = await db.update(bannerSettings).set({
      autoplayEnabled: input.autoplayEnabled,
      autoplayIntervalMs: input.autoplayIntervalMs,
      showNavigation: input.showNavigation,
      showIndicators: input.showIndicators,
      updatedBy: actorId,
      updatedAt: new Date(),
      version: sql`${bannerSettings.version} + 1`,
    }).where(and(eq(bannerSettings.placement, 'home_hero'), eq(bannerSettings.version, input.expectedVersion))).returning();
    if (!updated) throw new ConflictError('Hero settings changed in another session. Reload and try again.');
    await db.insert(contentAuditEvents).values({ entityType: 'banner_settings', entityId: updated.id, action: 'updated', actorId, metadata: { version: updated.version } });
    invalidate();
    return updated;
  },

  invalidatePublicCache: invalidate,
};
