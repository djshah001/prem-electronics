import { Request, Response } from 'express';
import { productsService } from './products.service.js';
import { createProductSchema, updateProductSchema, productQuerySchema } from './products.schema.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../core/utils/responseHandler.js';

export const productsController = {
  async getProducts(req: Request, res: Response) {
    const query = productQuerySchema.parse(req.query);
    const { data, meta } = await productsService.getProducts(query);
    sendSuccess(res, data, 'Products fetched successfully.', 200, meta);
  },

  async getFeatured(req: Request, res: Response) {
    const products = await productsService.getFeatured();
    sendSuccess(res, products);
  },

  async getBySlug(req: Request, res: Response) {
    const product = await productsService.getBySlug((req.params.slug as string));
    sendSuccess(res, product);
  },

  async getById(req: Request, res: Response) {
    const product = await productsService.getById((req.params.id as string));
    sendSuccess(res, product);
  },

  async getVariants(req: Request, res: Response) {
    const data = await productsService.getVariants(req.params.id as string);
    sendSuccess(res, data, 'Product variants fetched.');
  },

  async saveVariants(req: Request, res: Response) {
    const data = await productsService.saveVariants(req.params.id as string, req.body);
    sendSuccess(res, data, 'Product variants saved successfully.');
  },

  async create(req: Request, res: Response) {
    const input = createProductSchema.parse(req.body);
    const product = await productsService.create(input);
    sendCreated(res, product, 'Product created successfully.');
  },

  async update(req: Request, res: Response) {
    const input = updateProductSchema.parse(req.body);
    const product = await productsService.update((req.params.id as string), input);
    sendSuccess(res, product, 'Product updated successfully.');
  },

  async delete(req: Request, res: Response) {
    await productsService.delete((req.params.id as string));
    sendNoContent(res);
  },

  async softDelete(req: Request, res: Response) {
    const product = await productsService.softDelete((req.params.id as string));
    sendSuccess(res, product, 'Product archived successfully.');
  },

  async reactivate(req: Request, res: Response) {
    const product = await productsService.reactivate((req.params.id as string));
    sendSuccess(res, product, 'Product reactivated successfully.');
  },

  async getProductsAdmin(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as string | undefined;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const categoryId = req.query.categoryId as string | undefined;
    const { data, meta } = await productsService.getProductsAdmin({ page, limit, search, sortBy, sortOrder, isActive, categoryId });
    sendSuccess(res, data, 'Admin products fetched.', 200, meta);
  },

  async bulkDelete(req: Request, res: Response) {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'Invalid IDs array' });
    }
    await productsService.bulkDelete(ids);
    sendSuccess(res, null, 'Products deactivated successfully.');
  },
};
