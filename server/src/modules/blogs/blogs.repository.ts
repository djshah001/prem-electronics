import { eq, ilike, and, desc, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { blogs, users, type Blog, type NewBlog } from '../../infrastructure/database/schema/index.js';

export const blogsRepository = {
  async findMany(page: number, limit: number, search?: string): Promise<{ data: Blog[]; total: number }> {
    const offset = (page - 1) * limit;
    const conditions = [eq(blogs.isActive, true)];
    if (search) conditions.push(ilike(blogs.title, `%${search}%`));
    const whereClause = and(...conditions);

    const [data, countResult] = await Promise.all([
      db.select({
        id: blogs.id,
        title: blogs.title,
        slug: blogs.slug,
        imageUrl: blogs.imageUrl,
        seoTitle: blogs.seoTitle,
        seoDescription: blogs.seoDescription,
        isActive: blogs.isActive,
        authorId: blogs.authorId,
        createdAt: blogs.createdAt,
        updatedAt: blogs.updatedAt,
        content: blogs.content,
        authorName: sql<string>`(select name from ${users} where ${users.id} = ${blogs.authorId})`,
      })
        .from(blogs)
        .where(whereClause)
        .orderBy(desc(blogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(blogs).where(whereClause),
    ]);

    return { data: data as unknown as Blog[], total: Number(countResult[0].count) };
  },

  async findBySlug(slug: string) {
    const result = await db.select({
      id: blogs.id,
      title: blogs.title,
      slug: blogs.slug,
      content: blogs.content,
      imageUrl: blogs.imageUrl,
      seoTitle: blogs.seoTitle,
      seoDescription: blogs.seoDescription,
      isActive: blogs.isActive,
      authorId: blogs.authorId,
      createdAt: blogs.createdAt,
      updatedAt: blogs.updatedAt,
      authorName: sql<string>`(select name from ${users} where ${users.id} = ${blogs.authorId})`,
    })
      .from(blogs)
      .where(and(eq(blogs.slug, slug), eq(blogs.isActive, true)))
      .limit(1);
    return result[0];
  },

  async findById(id: string): Promise<Blog | undefined> {
    const result = await db.select().from(blogs).where(eq(blogs.id, id)).limit(1);
    return result[0];
  },

  async create(data: NewBlog): Promise<Blog> {
    const result = await db.insert(blogs).values(data).returning();
    return result[0];
  },

  async update(id: string, data: Partial<NewBlog>): Promise<Blog> {
    const result = await db.update(blogs).set({ ...data, updatedAt: new Date() }).where(eq(blogs.id, id)).returning();
    return result[0];
  },

  async delete(id: string): Promise<void> {
    await db.delete(blogs).where(eq(blogs.id, id));
  },
};
