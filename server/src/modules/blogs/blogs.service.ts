import { blogsRepository } from './blogs.repository.js';
import { NotFoundError, ConflictError } from '../../core/errors/appError.js';
import { buildPaginationMeta } from '../../core/utils/responseHandler.js';

export const blogsService = {
  async getBlogs(page: number, limit: number, search?: string) {
    const { data, total } = await blogsRepository.findMany(page, limit, search);
    const meta = buildPaginationMeta(page, limit, total);
    return { data, meta };
  },

  async getBySlug(slug: string) {
    const blog = await blogsRepository.findBySlug(slug);
    if (!blog) throw new NotFoundError('Blog post not found.');
    return blog;
  },

  async create(input: { title: string; slug: string; content: string; imageUrl?: string; authorId?: string; seoTitle?: string; seoDescription?: string }) {
    const existing = await blogsRepository.findBySlug(input.slug);
    if (existing) throw new ConflictError('A blog post with this slug already exists.');
    return blogsRepository.create(input);
  },

  async update(id: string, input: Record<string, unknown>) {
    const existing = await blogsRepository.findById(id);
    if (!existing) throw new NotFoundError('Blog post not found.');
    return blogsRepository.update(id, input as any);
  },

  async delete(id: string) {
    const existing = await blogsRepository.findById(id);
    if (!existing) throw new NotFoundError('Blog post not found.');
    await blogsRepository.delete(id);
  },
};
