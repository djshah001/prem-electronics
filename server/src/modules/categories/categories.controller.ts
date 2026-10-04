import { Request, Response } from 'express';
import { categoriesService } from './categories.service.js';
import { createCategorySchema, updateCategorySchema, categoryAdminQuerySchema, categoryBulkSchema } from './categories.schema.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../core/utils/responseHandler.js';

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
    const query = categoryAdminQuerySchema.parse(req.query);
    const { data, meta } = await categoriesService.getCategoriesAdmin(query);
    sendSuccess(res, data, 'Admin categories fetched.', 200, meta);
  },

  async bulkDelete(req: Request, res: Response) {
    const { ids } = categoryBulkSchema.parse(req.body);
    const result = await categoriesService.bulkDelete(ids);
    sendSuccess(res, result, 'Category archive operation completed.');
  },
};
