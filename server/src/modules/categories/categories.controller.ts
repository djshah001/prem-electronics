import { Request, Response } from 'express';
import { categoriesService } from './categories.service';
import { createCategorySchema, updateCategorySchema } from './categories.schema';
import { sendSuccess, sendCreated, sendNoContent } from '../../core/utils/responseHandler';

export const categoriesController = {
  async getTree(req: Request, res: Response) {
    const tree = await categoriesService.getTree();
    sendSuccess(res, tree);
  },

  async getBySlug(req: Request, res: Response) {
    const category = await categoriesService.getBySlug((req.params.slug as string));
    sendSuccess(res, category);
  },

  async create(req: Request, res: Response) {
    const input = createCategorySchema.parse(req.body);
    const category = await categoriesService.create(input);
    sendCreated(res, category, 'Category created successfully.');
  },

  async update(req: Request, res: Response) {
    const input = updateCategorySchema.parse(req.body);
    const category = await categoriesService.update((req.params.id as string), input);
    sendSuccess(res, category, 'Category updated successfully.');
  },

  async delete(req: Request, res: Response) {
    await categoriesService.delete((req.params.id as string));
    sendNoContent(res);
  },

  async getCategoriesAdmin(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as string | undefined;
    const { data, meta } = await categoriesService.getCategoriesAdmin({ page, limit, search, sortBy, sortOrder });
    sendSuccess(res, data, 'Admin categories fetched.', 200, meta);
  },

  async bulkDelete(req: Request, res: Response) {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'Invalid IDs array' });
    }
    await categoriesService.bulkDelete(ids);
    sendSuccess(res, null, 'Categories deleted successfully.');
  },
};
