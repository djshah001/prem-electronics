import { blogsRepository } from './blogs.repository.js';
import { AppError, ConflictError, NotFoundError } from '../../core/errors/appError.js';
import { buildPaginationMeta } from '../../core/utils/responseHandler.js';
import { blogTextContent, isAllowedBlogImageSource, sanitizeBlogHtml } from './blogSanitizer.js';
import type { BlogAdminQuery } from './blogs.schema.js';

const protectContent = <T extends { content: string }>(blog: T): T => ({
  ...blog,
  content: sanitizeBlogHtml(blog.content),
  ...('imageUrl' in blog && !isAllowedBlogImageSource((blog as any).imageUrl) ? { imageUrl: null } : {}),
});

const prepareContent = (content: string) => {
  const sanitized = sanitizeBlogHtml(content);
  if (blogTextContent(sanitized).length < 20) {
    throw new AppError('Blog content must contain at least 20 readable characters.', 400);
  }
  return sanitized;
};

export const blogsService = {
  async getPublic(page: number, limit: number, search?: string) {
    const { data, total } = await blogsRepository.findPublic(page, limit, search);
    return { data: data.map(protectContent), meta: buildPaginationMeta(page, limit, total) };
  },

  async getPublishedBySlug(slug: string) {
    const blog = await blogsRepository.findPublishedBySlug(slug);
    if (!blog) throw new NotFoundError('Blog post not found.');
    return protectContent(blog);
  },

  async getAdmin(query: BlogAdminQuery) {
    const { data, total } = await blogsRepository.findAdmin(query);
    return { data: data.map(protectContent), meta: buildPaginationMeta(query.page, query.limit, total) };
  },

  stats: () => blogsRepository.stats(),

  async getAdminById(id: string) {
    const blog = await blogsRepository.findById(id);
    if (!blog) throw new NotFoundError('Blog post not found.');
    return protectContent(blog);
  },

  async create(input: Record<string, unknown> & { title: string; slug: string; content: string; authorId: string }) {
    if (await blogsRepository.findBySlugAny(input.slug)) throw new ConflictError('A blog post with this slug already exists.');
    return blogsRepository.create({
      ...input,
      content: prepareContent(input.content),
      authorId: input.authorId,
      status: 'draft',
      isActive: true,
    } as any);
  },

  async update(id: string, input: Record<string, unknown> & { expectedVersion: number }) {
    const existing = await blogsRepository.findById(id);
    if (!existing) throw new NotFoundError('Blog post not found.');
    if (input.slug && input.slug !== existing.slug) {
      const collision = await blogsRepository.findBySlugAny(String(input.slug));
      if (collision && collision.id !== id) throw new ConflictError('A blog post with this slug already exists.');
    }
    const { expectedVersion, ...changes } = input;
    if (typeof changes.content === 'string') changes.content = prepareContent(changes.content);
    const updated = await blogsRepository.update(
      id, expectedVersion, changes as any, existing.content, existing.slug, existing.status === 'published'
    );
    if (!updated) throw new ConflictError('This post changed in another session. Reload before saving again.');
    return protectContent(updated);
  },

  async changeState(id: string, expectedVersion: number, action: 'publish' | 'unpublish' | 'archive' | 'restore') {
    const existing = await blogsRepository.findById(id);
    if (!existing) throw new NotFoundError('Blog post not found.');
    if (action === 'publish' && blogTextContent(sanitizeBlogHtml(existing.content)).length < 20) {
      throw new AppError('Add meaningful content before publishing.', 400);
    }
    const updated = await blogsRepository.changeState(id, expectedVersion, action);
    if (!updated) throw new ConflictError('This post changed in another session. Reload before changing its state.');
    return protectContent(updated);
  },

  async bulkArchive(ids: string[]) {
    const archivedIds = await blogsRepository.bulkArchive(ids);
    const archived = new Set(archivedIds);
    return {
      archived: archivedIds.length,
      ids: archivedIds,
      failed: ids.filter((id) => !archived.has(id)).map((id) => ({ id, reason: 'Already archived or not found.' })),
    };
  },
};
