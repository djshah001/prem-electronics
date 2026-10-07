import { Request, Response } from 'express';
import { productsService } from './products.service.js';
import { createProductSchema, updateProductSchema, productQuerySchema, productAdminQuerySchema, productBulkSchema } from './products.schema.js';
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
    const query = productAdminQuerySchema.parse(req.query);
    const { data, meta } = await productsService.getProductsAdmin(query);
    sendSuccess(res, data, 'Admin products fetched.', 200, meta);
  },

  async bulkDelete(req: Request, res: Response) {
    const { ids } = productBulkSchema.parse(req.body);
    await productsService.bulkDelete(ids);
    sendSuccess(res, null, 'Products deactivated successfully.');
  },
};
