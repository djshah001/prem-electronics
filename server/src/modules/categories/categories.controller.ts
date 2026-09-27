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
};
