import { and, asc, desc, eq, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  blogContentRevisions,
  blogs,
  blogSlugRedirects,
  users,
  type NewBlog,
} from '../../infrastructure/database/schema/index.js';
import type { BlogAdminQuery } from './blogs.schema.js';

const blogProjection = {
  id: blogs.id,
  title: blogs.title,
  slug: blogs.slug,
  excerpt: blogs.excerpt,
  content: blogs.content,
  editorJson: blogs.editorJson,
  editorSchemaVersion: blogs.editorSchemaVersion,
  editorMigrationStatus: blogs.editorMigrationStatus,
  imageUrl: blogs.imageUrl,
  coverAlt: blogs.coverAlt,
  seoTitle: blogs.seoTitle,
  seoDescription: blogs.seoDescription,
  status: blogs.status,
  isActive: blogs.isActive,
  publishedAt: blogs.publishedAt,
  archivedAt: blogs.archivedAt,
  version: blogs.version,
  authorId: blogs.authorId,
  createdAt: blogs.createdAt,
  updatedAt: blogs.updatedAt,
  authorName: users.name,
};

const sortColumns = {
  title: blogs.title,
  status: blogs.status,
  publishedAt: blogs.publishedAt,
  updatedAt: blogs.updatedAt,
  createdAt: blogs.createdAt,
} as const;

export const blogsRepository = {
  async findPublic(page: number, limit: number, search?: string) {
    const conditions = [
      eq(blogs.status, 'published'),
      eq(blogs.isActive, true),
      lte(blogs.publishedAt, new Date()),
    ];
    if (search) conditions.push(or(ilike(blogs.title, `%${search}%`), ilike(blogs.excerpt, `%${search}%`))!);
    const where = and(...conditions);
    const [data, count] = await Promise.all([
      db.select(blogProjection).from(blogs).leftJoin(users, eq(users.id, blogs.authorId))
        .where(where).orderBy(desc(blogs.publishedAt), desc(blogs.id))
        .limit(limit).offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` }).from(blogs).where(where),
    ]);
    return { data, total: Number(count[0]?.count ?? 0) };
  },

  async findPublishedBySlug(slug: string) {
    const visible = and(
      eq(blogs.status, 'published'),
      eq(blogs.isActive, true),
      lte(blogs.publishedAt, new Date())
    );
    const [direct] = await db.select(blogProjection).from(blogs)
      .leftJoin(users, eq(users.id, blogs.authorId))
      .where(and(eq(blogs.slug, slug), visible)).limit(1);
    if (direct) return { ...direct, redirectedFrom: null as string | null };

    const [redirect] = await db.select(blogProjection).from(blogSlugRedirects)
      .innerJoin(blogs, eq(blogs.id, blogSlugRedirects.blogId))
      .leftJoin(users, eq(users.id, blogs.authorId))
      .where(and(eq(blogSlugRedirects.oldSlug, slug), visible)).limit(1);
    return redirect ? { ...redirect, redirectedFrom: slug } : undefined;
  },

  async findAdmin(query: BlogAdminQuery) {
    const conditions = [];
    if (query.search) conditions.push(or(ilike(blogs.title, `%${query.search}%`), ilike(blogs.slug, `%${query.search}%`))!);
    if (query.status) conditions.push(eq(blogs.status, query.status));
    const where = conditions.length ? and(...conditions) : undefined;
    const column = sortColumns[query.sortBy];
    const primaryOrder = query.sortOrder === 'asc' ? asc(column) : desc(column);
    const [data, count] = await Promise.all([
      db.select(blogProjection).from(blogs).leftJoin(users, eq(users.id, blogs.authorId))
        .where(where).orderBy(primaryOrder, desc(blogs.id))
        .limit(query.limit).offset((query.page - 1) * query.limit),
      db.select({ count: sql<number>`count(*)` }).from(blogs).where(where),
    ]);
    return { data, total: Number(count[0]?.count ?? 0) };
  },

  async stats() {
    const [result] = await db.select({
      draft: sql<number>`count(*) filter (where ${blogs.status} = 'draft')`,
      published: sql<number>`count(*) filter (where ${blogs.status} = 'published')`,
      archived: sql<number>`count(*) filter (where ${blogs.status} = 'archived')`,
      total: sql<number>`count(*)`,
    }).from(blogs);
    return Object.fromEntries(Object.entries(result).map(([key, value]) => [key, Number(value)]));
  },

  async findById(id: string) {
    const [result] = await db.select(blogProjection).from(blogs)
      .leftJoin(users, eq(users.id, blogs.authorId)).where(eq(blogs.id, id)).limit(1);
    return result;
  },

  async findBySlugAny(slug: string) {
    const [result] = await db.select({ id: blogs.id }).from(blogs).where(eq(blogs.slug, slug)).limit(1);
    return result;
  },

  async create(data: NewBlog) {
    const [result] = await db.insert(blogs).values(data).returning();
    return result;
  },

  async update(id: string, expectedVersion: number, data: Partial<NewBlog>, previousContent: string, previousSlug: string, wasPublished: boolean, previousEditorJson?: Record<string, unknown> | null) {
    return db.transaction(async (tx) => {
      const [updated] = await tx.update(blogs).set({
        ...data,
        version: sql`${blogs.version} + 1`,
        updatedAt: new Date(),
      }).where(and(eq(blogs.id, id), eq(blogs.version, expectedVersion))).returning();
      if (!updated) return undefined;
      await tx.insert(blogContentRevisions).values({
        blogId: id,
        content: previousContent,
        editorJson: previousEditorJson,
        version: expectedVersion,
        reason: 'edit',
      });
      if (data.slug && data.slug !== previousSlug && wasPublished) {
        await tx.insert(blogSlugRedirects).values({ blogId: id, oldSlug: previousSlug }).onConflictDoNothing();
      }
      return updated;
    });
  },

  async changeState(id: string, expectedVersion: number, action: 'publish' | 'unpublish' | 'archive' | 'restore') {
    const now = new Date();
    const values: Partial<NewBlog> = action === 'publish'
      ? { status: 'published', isActive: true, publishedAt: now, archivedAt: null }
      : action === 'unpublish'
        ? { status: 'draft', publishedAt: null, archivedAt: null }
        : action === 'archive'
          ? { status: 'archived', isActive: false, archivedAt: now }
          : { status: 'draft', isActive: true, archivedAt: null, publishedAt: null };
    const [updated] = await db.update(blogs).set({
      ...values,
      version: sql`${blogs.version} + 1`,
      updatedAt: now,
    }).where(and(eq(blogs.id, id), eq(blogs.version, expectedVersion))).returning();
    return updated;
  },

  async bulkArchive(ids: string[]) {
    const archived = await db.update(blogs).set({
      status: 'archived', isActive: false, archivedAt: new Date(),
      version: sql`${blogs.version} + 1`, updatedAt: new Date(),
    }).where(and(inArray(blogs.id, ids), sql`${blogs.status} <> 'archived'`)).returning({ id: blogs.id });
    return archived.map((item) => item.id);
  },
};
