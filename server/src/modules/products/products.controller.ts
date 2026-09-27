import { Request, Response } from 'express';
import { productsService } from './products.service';
import { createProductSchema, updateProductSchema, productQuerySchema } from './products.schema';
import { sendSuccess, sendCreated, sendNoContent } from '../../core/utils/responseHandler';

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
    const { data, meta } = await productsService.getProductsAdmin({ page, limit, search });
    sendSuccess(res, data, 'Admin products fetched.', 200, meta);
  },
};
