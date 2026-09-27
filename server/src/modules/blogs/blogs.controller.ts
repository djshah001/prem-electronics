import { Request, Response } from 'express';
import { blogsService } from './blogs.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../core/utils/responseHandler';

export const blogsController = {
  async getBlogs(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 9;
    const search = req.query.search as string | undefined;
    const { data, meta } = await blogsService.getBlogs(page, limit, search);
    sendSuccess(res, data, 'Blogs fetched.', 200, meta);
  },

  async getBySlug(req: Request, res: Response) {
    const blog = await blogsService.getBySlug((req.params.slug as string));
    sendSuccess(res, blog);
  },

  async create(req: Request, res: Response) {
    const blog = await blogsService.create({ ...req.body, authorId: req.user?.id });
    sendCreated(res, blog, 'Blog post created.');
  },

  async update(req: Request, res: Response) {
    const blog = await blogsService.update((req.params.id as string), req.body);
    sendSuccess(res, blog, 'Blog post updated.');
  },

  async delete(req: Request, res: Response) {
    await blogsService.delete((req.params.id as string));
    sendNoContent(res);
  },
};
