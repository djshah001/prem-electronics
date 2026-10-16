import { eq, and, gte, lte, ilike, or, sql, desc, asc, inArray } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  products,
  categories,
  productOptions,
  productOptionValues,
  productVariants,
  variantOptionValues,
  type Product,
  type NewProduct,
} from '../../infrastructure/database/schema/index.js';
import type { ProductQuery } from './products.schema.js';

type ProductWithVariantFlag = Product & { hasVariants: boolean };

const attachVariantFlags = async (productList: Product[]): Promise<ProductWithVariantFlag[]> => {
  if (productList.length === 0) return [];

  const optionOwners = await db
    .selectDistinct({ productId: productOptions.productId })
    .from(productOptions)
    .where(inArray(productOptions.productId, productList.map((product) => product.id)));
  const productsWithOptions = new Set(optionOwners.map(({ productId }) => productId));

  return productList.map((product) => ({
    ...product,
    hasVariants: productsWithOptions.has(product.id),
  }));
};

export const productsRepository = {
  async getCategorySnapshot(categoryId: string | null) {
    if (!categoryId) return { id: null, name: 'Unknown / uncategorized' };
    const [category] = await db.select({ id: categories.id, name: categories.name })
      .from(categories).where(eq(categories.id, categoryId)).limit(1);
    return category ?? { id: null, name: 'Unknown / uncategorized' };
  },

  async findMany(query: ProductQuery): Promise<{ data: ProductWithVariantFlag[]; total: number }> {
    const {
      page,
      limit,
      search,
      categoryId,
      minPrice,
      maxPrice,
      brand,
      minRating,
      inStock,
      isFeatured,
      isNewArrival,
      isBestSeller,
      sortBy,
    } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(products.isActive, true)];

    if (search) {
      conditions.push(
        or(
          ilike(products.title, `%${search}%`),
          ilike(products.description ?? sql`''`, `%${search}%`),
          ilike(products.brand ?? sql`''`, `%${search}%`)
        )!
      );
    }
    if (categoryId) {
      const childCategories = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.parentId, categoryId));
      if (childCategories.length > 0) {
        const categoryIds = [categoryId, ...childCategories.map((c) => c.id)];
        conditions.push(inArray(products.categoryId, categoryIds));
      } else {
        conditions.push(eq(products.categoryId, categoryId));
      }
    }
    if (minPrice !== undefined) conditions.push(gte(products.price, String(minPrice)));
    if (maxPrice !== undefined) conditions.push(lte(products.price, String(maxPrice)));
    if (brand) conditions.push(ilike(products.brand ?? sql`''`, `%${brand}%`));
    if (minRating !== undefined) conditions.push(gte(products.avgRating, String(minRating)));
    if (inStock) conditions.push(gte(products.stock, 1));
    if (isFeatured) conditions.push(eq(products.isFeatured, true));
    if (isNewArrival) conditions.push(eq(products.isNewArrival, true));
    if (isBestSeller) conditions.push(eq(products.isBestSeller, true));

    const whereClause = and(...conditions);

    let orderClause;
    switch (sortBy) {
      case 'price_asc': orderClause = asc(products.price); break;
      case 'price_desc': orderClause = desc(products.price); break;
      case 'rating': orderClause = desc(products.avgRating); break;
      case 'popular': orderClause = desc(products.reviewCount); break;
      default: orderClause = desc(products.createdAt);
    }

    const [data, countResult] = await Promise.all([
      db.select().from(products).where(whereClause).orderBy(orderClause, desc(products.id)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause),
    ]);

    return { data: await attachVariantFlags(data), total: Number(countResult[0].count) };
  },

  async findBySlug(slug: string, activeOnly = true): Promise<Product | undefined> {
    const conditions = [eq(products.slug, slug)];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    const result = await db.select().from(products).where(and(...conditions)).limit(1);
    return result[0];
  },

  async findBySlugWithVariants(slug: string, activeOnly = true) {
    const product = await this.findBySlug(slug, activeOnly);
    if (!product) return undefined;
    const variantsData = await this.getOptionsAndVariants(product.id);
    return {
      ...product,
      ...variantsData,
    };
  },

  async findById(id: string, activeOnly = false): Promise<Product | undefined> {
    const conditions = [eq(products.id, id)];
    if (activeOnly) conditions.push(eq(products.isActive, true));
    const result = await db.select().from(products).where(and(...conditions)).limit(1);
    return result[0];
  },

  async findByIdWithVariants(id: string, activeOnly = false) {
    const product = await this.findById(id, activeOnly);
    if (!product) return undefined;
    const variantsData = await this.getOptionsAndVariants(product.id);
    return {
      ...product,
      ...variantsData,
    };
  },

  async findBySku(sku: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
    return result[0];
  },

  async create(data: NewProduct): Promise<Product> {
    const result = await db.insert(products).values(data).returning();
    const product = result[0];

    // Automatically create a default variant for this product
    const priceMinor = Math.round(Number(product.price) * 100);
    const salePriceMinor = product.salePrice ? Math.round(Number(product.salePrice) * 100) : null;
    await db.insert(productVariants).values({
      productId: product.id,
      sku: product.sku,
      barcode: product.barcode,
      price: product.price,
      salePrice: product.salePrice,
      priceMinor,
      salePriceMinor,
      stockQuantity: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      isActive: product.isActive,
      optionCombinationKey: 'default',
    }).onConflictDoNothing();

    return product;
  },

  async update(id: string, data: Partial<NewProduct>): Promise<Product> {
    const result = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return result[0];
  },

  async decrementStock(id: string, quantity: number): Promise<void> {
    await db
      .update(products)
      .set({ stock: sql`${products.stock} - ${quantity}`, updatedAt: new Date() })
      .where(eq(products.id, id));
  },

  async updateRating(id: string, avgRating: number, reviewCount: number): Promise<void> {
    await db
      .update(products)
      .set({ avgRating: String(avgRating), reviewCount, updatedAt: new Date() })
      .where(eq(products.id, id));
  },

  async delete(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  },

  async softDelete(id: string): Promise<Product> {
    const result = await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return result[0];
  },

  async reactivate(id: string): Promise<Product> {
    const result = await db
      .update(products)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return result[0];
  },

  async findAllAdmin(page: number, limit: number, search?: string, isActive?: boolean, categoryId?: string, sortBy?: string, sortOrder?: 'asc' | 'desc') {
    const offset = (page - 1) * limit;
    const conditions = [];
    if (search) {
      conditions.push(or(ilike(products.title, `%${search}%`), ilike(products.sku, `%${search}%`))!);
    }
    if (isActive !== undefined) {
      conditions.push(eq(products.isActive, isActive));
    }
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    let orderCol = products.createdAt;
    if (sortBy === 'title') orderCol = products.title as any;
    if (sortBy === 'price') orderCol = products.price as any;
    if (sortBy === 'stock') orderCol = products.stock as any;
    if (sortBy === 'isActive') orderCol = products.isActive as any;
    
    const orderClause = sortOrder === 'asc' ? asc(orderCol) : desc(orderCol);

    const [data, countResult] = await Promise.all([
      db.select().from(products).where(whereClause).orderBy(orderClause).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(products).where(whereClause),
    ]);
    return { data, total: Number(countResult[0].count) };
  },

  async findFeatured(limit = 8): Promise<ProductWithVariantFlag[]> {
    const featuredProducts = await db.select().from(products)
      .where(and(eq(products.isFeatured, true), eq(products.isActive, true)))
      .orderBy(desc(products.createdAt))
      .limit(limit);
    return attachVariantFlags(featuredProducts);
  },

  async findLowStock(threshold = 5): Promise<Product[]> {
    return db.select().from(products)
      .where(and(lte(products.stock, threshold), eq(products.isActive, true)))
      .orderBy(asc(products.stock));
  },

  async bulkDelete(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    await db.update(products).set({ isActive: false, updatedAt: new Date() }).where(inArray(products.id, ids));
  },

  // ─── Variants & Options ──────────────────────────────────────────────────────

  async getOptionsAndVariants(productId: string) {
    const options = await db
      .select()
      .from(productOptions)
      .where(eq(productOptions.productId, productId))
      .orderBy(asc(productOptions.displayOrder));
    const optionIds = options.map((o) => o.id);

    const values = optionIds.length > 0
      ? await db
          .select()
          .from(productOptionValues)
          .where(inArray(productOptionValues.optionId, optionIds))
          .orderBy(asc(productOptionValues.displayOrder))
      : [];

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(asc(productVariants.createdAt));
    const variantIds = variants.map((v) => v.id);

    const mappings = variantIds.length > 0
      ? await db
          .select()
          .from(variantOptionValues)
          .where(inArray(variantOptionValues.variantId, variantIds))
      : [];

    return {
      options: options.map((opt) => ({
        ...opt,
        values: values.filter((v) => v.optionId === opt.id),
      })),
      variants: variants.map((v) => ({
        ...v,
        optionValues: mappings.filter((m) => m.variantId === v.id).map((m) => m.optionValueId),
      })),
    };
  },

  async saveOptionsAndVariants(
    productId: string,
    optionsData: Array<{
      name: string;
      displayOrder?: number;
      values: Array<{ label: string; colorSwatch?: string; displayOrder?: number }>;
    }>,
    variantsData: Array<{
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
    }>
  ) {
    return db.transaction(async (tx) => {
      // 1. Delete existing options and option values (cascades)
      await tx.delete(productOptions).where(eq(productOptions.productId, productId));

      // 2. Insert new options and values
      const labelToValueId = new Map<string, { optionId: string; valueId: string }>();

      for (let i = 0; i < optionsData.length; i++) {
        const opt = optionsData[i];
        const normalizedKey = opt.name.trim().toLowerCase().replace(/\s+/g, '-');
        const [insertedOpt] = await tx
          .insert(productOptions)
          .values({
            productId,
            name: opt.name.trim(),
            normalizedKey,
            displayOrder: opt.displayOrder ?? i,
          })
          .returning();

        for (let j = 0; j < opt.values.length; j++) {
          const val = opt.values[j];
          const normalizedVal = val.label.trim().toLowerCase().replace(/\s+/g, '-');
          const [insertedVal] = await tx
            .insert(productOptionValues)
            .values({
              optionId: insertedOpt.id,
              label: val.label.trim(),
              normalizedValue: normalizedVal,
              displayOrder: val.displayOrder ?? j,
              colorSwatch: val.colorSwatch ?? null,
            })
            .returning();

          labelToValueId.set(
            `${opt.name.trim().toLowerCase()}:::${val.label.trim().toLowerCase()}`,
            { optionId: insertedOpt.id, valueId: insertedVal.id }
          );
        }
      }

      // 3. Upsert variants
      const existingVariants = await tx
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, productId));
      const existingSkuMap = new Map(existingVariants.map((v) => [v.sku, v]));

      for (const v of variantsData) {
        const priceMinor = Math.round(Number(v.price) * 100);
        const salePriceMinor = v.salePrice ? Math.round(Number(v.salePrice) * 100) : null;
        const existing = existingSkuMap.get(v.sku);

        let variantId: string;
        if (existing) {
          const [updated] = await tx
            .update(productVariants)
            .set({
              barcode: v.barcode ?? null,
              price: String(v.price),
              salePrice: v.salePrice ? String(v.salePrice) : null,
              priceMinor,
              salePriceMinor,
              stockQuantity: v.stockQuantity,
              lowStockThreshold: v.lowStockThreshold ?? 5,
              isActive: v.isActive ?? true,
              optionCombinationKey: v.optionCombinationKey,
              updatedAt: new Date(),
            })
            .where(eq(productVariants.id, existing.id))
            .returning();
          variantId = updated.id;
          await tx.delete(variantOptionValues).where(eq(variantOptionValues.variantId, variantId));
        } else {
          const [inserted] = await tx
            .insert(productVariants)
            .values({
              productId,
              sku: v.sku,
              barcode: v.barcode ?? null,
              price: String(v.price),
              salePrice: v.salePrice ? String(v.salePrice) : null,
              priceMinor,
              salePriceMinor,
              stockQuantity: v.stockQuantity,
              lowStockThreshold: v.lowStockThreshold ?? 5,
              isActive: v.isActive ?? true,
              optionCombinationKey: v.optionCombinationKey,
            })
            .returning();
          variantId = inserted.id;
        }

        // Link option values from optionValueLabels
        if (v.optionValueLabels && v.optionValueLabels.length > 0) {
          for (const pair of v.optionValueLabels) {
            const key = `${pair.optionName.trim().toLowerCase()}:::${pair.valueLabel.trim().toLowerCase()}`;
            const target = labelToValueId.get(key);
            if (target) {
              await tx
                .insert(variantOptionValues)
                .values({
                  variantId,
                  optionId: target.optionId,
                  optionValueId: target.valueId,
                })
                .onConflictDoNothing();
            }
          }
        }
      }

      // 4. Update product aggregate stock & price from active variants
      const allProductVariants = await tx
        .select()
        .from(productVariants)
        .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)));
      
      if (allProductVariants.length > 0) {
        const totalStock = allProductVariants.reduce((sum, v) => sum + v.stockQuantity, 0);
        const minPrice = allProductVariants.reduce((min, v) => Math.min(min, Number(v.price)), Infinity);
        await tx
          .update(products)
          .set({
            stock: totalStock,
            price: isFinite(minPrice) ? String(minPrice) : undefined,
            updatedAt: new Date(),
          })
          .where(eq(products.id, productId));
      }
    });
  },

  async findVariantById(variantId: string) {
    const result = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).limit(1);
    return result[0];
  },
};
