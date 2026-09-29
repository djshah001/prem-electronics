import { productsRepository } from './products.repository';
import { NotFoundError, ConflictError } from '../../core/errors/appError';
import { buildPaginationMeta } from '../../core/utils/responseHandler';
import type { CreateProductInput, UpdateProductInput, ProductQuery } from './products.schema';

export const productsService = {
  async getProducts(query: ProductQuery) {
    const { data, total } = await productsRepository.findMany(query);
    const meta = buildPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  },

  async getBySlug(slug: string) {
    const product = await productsRepository.findBySlug(slug);
    if (!product) throw new NotFoundError('Product not found.');
    return product;
  },

  async getById(id: string) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError('Product not found.');
    return product;
  },

  async getFeatured() {
    return productsRepository.findFeatured();
  },

  async create(input: CreateProductInput) {
    const [slugConflict, skuConflict] = await Promise.all([
      productsRepository.findBySlug(input.slug, false),
      productsRepository.findBySku(input.sku),
    ]);
    if (slugConflict) throw new ConflictError('A product with this slug already exists.');
    if (skuConflict) throw new ConflictError('A product with this SKU already exists.');

    return productsRepository.create({
      ...input,
      price: String(input.price),
      salePrice: input.salePrice ? String(input.salePrice) : undefined,
    });
  },

  async update(id: string, input: UpdateProductInput) {
    const existing = await productsRepository.findById(id);
    if (!existing) throw new NotFoundError('Product not found.');

    if (input.slug && input.slug !== existing.slug) {
      const conflict = await productsRepository.findBySlug(input.slug, false);
      if (conflict) throw new ConflictError('A product with this slug already exists.');
    }
    if (input.sku && input.sku !== existing.sku) {
      const conflict = await productsRepository.findBySku(input.sku);
      if (conflict) throw new ConflictError('A product with this SKU already exists.');
    }

    return productsRepository.update(id, {
      ...input,
      price: input.price ? String(input.price) : undefined,
      salePrice: input.salePrice ? String(input.salePrice) : undefined,
    });
  },

  async delete(id: string) {
    const existing = await productsRepository.findById(id);
    if (!existing) throw new NotFoundError('Product not found.');
    await productsRepository.delete(id);
  },

  async softDelete(id: string) {
    const existing = await productsRepository.findById(id);
    if (!existing) throw new NotFoundError('Product not found.');
    return productsRepository.softDelete(id);
  },

  async reactivate(id: string) {
    const existing = await productsRepository.findById(id);
    if (!existing) throw new NotFoundError('Product not found.');
    return productsRepository.reactivate(id);
  },

  async getProductsAdmin(query: { page: number; limit: number; search?: string; sortBy?: string; sortOrder?: string; isActive?: boolean; categoryId?: string }) {
    const { data, total } = await productsRepository.findAllAdmin(query.page, query.limit, query.search, query.sortBy, query.sortOrder as 'asc' | 'desc', query.isActive, query.categoryId);
    const meta = buildPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  },

  async bulkDelete(ids: string[]) {
    return productsRepository.bulkDelete(ids);
  },

  async getLowStockAlerts() {
    return productsRepository.findLowStock();
  },
};
