import { pgTable, uuid, varchar, text, boolean, timestamp, pgEnum, integer, index, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users.js';

export const blogStatusEnum = pgEnum('blog_status', ['draft', 'published', 'archived']);

export const blogs = pgTable('blogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 300 }).notNull().unique(),
  content: text('content').notNull(),
  editorJson: jsonb('editor_json').$type<Record<string, unknown>>(),
  editorSchemaVersion: integer('editor_schema_version').default(1).notNull(),
  editorMigrationStatus: varchar('editor_migration_status', { length: 30 }).default('legacy_html').notNull(),
  excerpt: varchar('excerpt', { length: 500 }),
  imageUrl: varchar('image_url', { length: 1000 }),
  coverAlt: varchar('cover_alt', { length: 255 }),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  seoTitle: varchar('seo_title', { length: 255 }),
  seoDescription: varchar('seo_description', { length: 500 }),
  status: blogStatusEnum('status').default('draft').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  version: integer('version').default(1).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('blogs_status_published_at_idx').on(table.status, table.publishedAt),
  index('blogs_updated_at_idx').on(table.updatedAt),
]);

export const blogContentRevisions = pgTable('blog_content_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  blogId: uuid('blog_id').notNull().references(() => blogs.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  editorJson: jsonb('editor_json').$type<Record<string, unknown>>(),
  version: integer('version').notNull(),
  reason: varchar('reason', { length: 50 }).default('edit').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('blog_content_revisions_blog_id_idx').on(table.blogId)]);

export const blogSlugRedirects = pgTable('blog_slug_redirects', {
  id: uuid('id').primaryKey().defaultRandom(),
  blogId: uuid('blog_id').notNull().references(() => blogs.id, { onDelete: 'cascade' }),
  oldSlug: varchar('old_slug', { length: 300 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('blog_slug_redirects_blog_id_idx').on(table.blogId)]);

export const blogsRelations = relations(blogs, ({ one }) => ({
  author: one(users, { fields: [blogs.authorId], references: [users.id] }),
}));

export const insertBlogSchema = createInsertSchema(blogs);
export const selectBlogSchema = createSelectSchema(blogs);

export type Blog = typeof blogs.$inferSelect;
export type NewBlog = typeof blogs.$inferInsert;
