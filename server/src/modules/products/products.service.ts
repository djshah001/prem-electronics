import { productsRepository } from './products.repository.js';
import { NotFoundError, ConflictError } from '../../core/errors/appError.js';
import { buildPaginationMeta } from '../../core/utils/responseHandler.js';
import type { CreateProductInput, UpdateProductInput, ProductQuery } from './products.schema.js';
import { categoriesRepository } from '../categories/categories.repository.js';

const assertEligibleCategory = async (categoryId: string) => {
  const category = await categoriesRepository.findById(categoryId);
  if (!category || !category.isActive) {
    throw new ConflictError('Product category must exist and be active.');
  }
};

export const productsService = {
  async getProducts(query: ProductQuery) {
    const { data, total } = await productsRepository.findMany(query);
    const meta = buildPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  },

  async getBySlug(slug: string) {
    const product = await productsRepository.findBySlugWithVariants(slug);
    if (!product) throw new NotFoundError('Product not found.');
    return product;
  },

  async getById(id: string) {
    const product = await productsRepository.findByIdWithVariants(id, false);
    if (!product) throw new NotFoundError('Product not found.');
    return product;
  },

  async getVariants(productId: string) {
    const product = await productsRepository.findById(productId);
    if (!product) throw new NotFoundError('Product not found.');
    return productsRepository.getOptionsAndVariants(productId);
  },

  async saveVariants(
    productId: string,
    data: {
      options: Array<{
        name: string;
        displayOrder?: number;
        values: Array<{ label: string; colorSwatch?: string; displayOrder?: number }>;
      }>;
      variants: Array<{
        id?: string;
        sku: string;
        barcode?: string | null;
        price: number;
        salePrice?: number | null;
        stockQuantity: number;
        lowStockThreshold?: number;
        isActive?: boolean;
        optionCombinationKey: string;
        optionValueLabels?: Array<{ optionName: string; valueLabel: string }>;
      }>;
    }
  ) {
    const product = await productsRepository.findById(productId);
    if (!product) throw new NotFoundError('Product not found.');
    await productsRepository.saveOptionsAndVariants(productId, data.options || [], data.variants || []);
    return productsRepository.getOptionsAndVariants(productId);
  },

  async getFeatured() {
    return productsRepository.findFeatured();
  },

  async create(input: CreateProductInput) {
    await assertEligibleCategory(input.categoryId);
    const [slugConflict, skuConflict] = await Promise.all([
      productsRepository.findBySlug(input.slug, false),
      productsRepository.findBySku(input.sku),
    ]);
    if (slugConflict) throw new ConflictError('A product with this slug already exists.');
    if (skuConflict) throw new ConflictError('A product with this SKU already exists.');

    return productsRepository.create({
      ...input,
      price: String(input.price),
      salePrice: input.salePrice === undefined ? undefined : (input.salePrice === null ? null : String(input.salePrice)),
    });
  },

  async update(id: string, input: UpdateProductInput) {
    const existing = await productsRepository.findById(id);
    if (!existing) throw new NotFoundError('Product not found.');
    if (input.categoryId) await assertEligibleCategory(input.categoryId);
    if (input.isActive === true) {
      await assertEligibleCategory(input.categoryId ?? existing.categoryId ?? '');
    }

    const effectivePrice = input.price ?? Number(existing.price);
    const effectiveSalePrice = input.salePrice === undefined
      ? (existing.salePrice ? Number(existing.salePrice) : null)
      : input.salePrice;
    if (effectiveSalePrice != null && effectiveSalePrice >= effectivePrice) {
      throw new ConflictError('Sale price must be lower than the regular price.');
    }

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
      salePrice: input.salePrice === undefined ? undefined : (input.salePrice === null ? null : String(input.salePrice)),
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
    await assertEligibleCategory(existing.categoryId ?? '');
    return productsRepository.reactivate(id);
  },

  async getProductsAdmin(query: { page: number; limit: number; search?: string; sortBy?: string; sortOrder?: string; isActive?: boolean; categoryId?: string }) {
    const { data, total } = await productsRepository.findAllAdmin(query.page, query.limit, query.search, query.isActive, query.categoryId, query.sortBy, query.sortOrder as 'asc' | 'desc');
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
