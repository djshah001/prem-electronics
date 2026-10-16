import { and, asc, desc, eq, gt, ilike, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { bannerSettings, banners, mediaAssets, type NewBanner } from '../../infrastructure/database/schema/index.js';
import type { BannerAdminQuery } from './banners.schema.js';

const visibilityCondition = (visibility: BannerAdminQuery['visibility'], now: Date) => {
  if (visibility === 'archived') return isNotNull(banners.archivedAt);
  if (visibility === 'inactive') return and(isNull(banners.archivedAt), eq(banners.isActive, false));
  if (visibility === 'scheduled') return and(isNull(banners.archivedAt), eq(banners.isActive, true), gt(banners.startsAt, now));
  if (visibility === 'expired') return and(isNull(banners.archivedAt), lte(banners.endsAt, now));
  if (visibility === 'visible') return and(
    isNull(banners.archivedAt), eq(banners.isActive, true),
    or(isNull(banners.startsAt), lte(banners.startsAt, now)),
    or(isNull(banners.endsAt), gt(banners.endsAt, now)),
  );
  return undefined;
};

export const bannersRepository = {
  async listPublic(placement: 'home_hero', now: Date) {
    return db.select().from(banners).where(and(
      eq(banners.placement, placement),
      eq(banners.isActive, true),
      isNull(banners.archivedAt),
      or(isNull(banners.startsAt), lte(banners.startsAt, now)),
      or(isNull(banners.endsAt), gt(banners.endsAt, now)),
    )).orderBy(asc(banners.sortOrder), asc(banners.id));
  },

  async listAdmin(query: BannerAdminQuery, now: Date) {
    const conditions = [
      eq(banners.placement, query.placement),
      query.search ? ilike(banners.internalName, `%${query.search}%`) : undefined,
      visibilityCondition(query.visibility, now),
    ].filter(Boolean) as any[];
    const where = and(...conditions);
    const orderColumn = {
      sortOrder: banners.sortOrder,
      internalName: banners.internalName,
      updatedAt: banners.updatedAt,
      createdAt: banners.createdAt,
    }[query.sortBy];
    const order = query.sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);
    const [data, count, counts] = await Promise.all([
      db.select().from(banners).where(where).orderBy(order, asc(banners.id))
        .limit(query.limit).offset((query.page - 1) * query.limit),
      db.select({ value: sql<number>`count(*)` }).from(banners).where(where),
      db.select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${banners.isActive} = true and ${banners.archivedAt} is null)`,
        archived: sql<number>`count(*) filter (where ${banners.archivedAt} is not null)`,
      }).from(banners).where(eq(banners.placement, query.placement)),
    ]);
    return {
      data,
      total: Number(count[0]?.value ?? 0),
      counts: { total: Number(counts[0]?.total ?? 0), active: Number(counts[0]?.active ?? 0), archived: Number(counts[0]?.archived ?? 0) },
    };
  },

  listForOrdering(placement: 'home_hero') {
    return db.select().from(banners).where(and(eq(banners.placement, placement), isNull(banners.archivedAt)))
      .orderBy(asc(banners.sortOrder), asc(banners.id));
  },

  async findById(id: string) {
    return (await db.select().from(banners).where(eq(banners.id, id)).limit(1))[0];
  },

  async findAssets(ids: string[]) {
    if (!ids.length) return [];
    return db.select().from(mediaAssets).where(inArray(mediaAssets.id, [...new Set(ids)]));
  },

  async findAsset(id: string) {
    return (await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1))[0];
  },

  async create(input: NewBanner) {
    return (await db.insert(banners).values(input).returning())[0];
  },

  async settings(placement: 'home_hero') {
    const existing = (await db.select().from(bannerSettings).where(eq(bannerSettings.placement, placement)).limit(1))[0];
    if (existing) return existing;
    return (await db.insert(bannerSettings).values({ placement }).onConflictDoNothing().returning())[0]
      ?? (await db.select().from(bannerSettings).where(eq(bannerSettings.placement, placement)).limit(1))[0];
  },

  async nextBoundary(placement: 'home_hero', now: Date) {
    const result = await db.select({ boundary: sql<Date | null>`min(boundary)` }).from(sql`(
      select starts_at as boundary from banners where placement = ${placement} and is_active = true and archived_at is null and starts_at > ${now}
      union all
      select ends_at as boundary from banners where placement = ${placement} and is_active = true and archived_at is null and ends_at > ${now}
    ) boundaries`);
    return result[0]?.boundary ? new Date(result[0].boundary) : null;
  },
};
