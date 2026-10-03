import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { products } from './products.js';

export const productOptions = pgTable('product_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  normalizedKey: varchar('normalized_key', { length: 100 }).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('product_options_product_key_idx').on(table.productId, table.normalizedKey),
]);

export const productOptionValues = pgTable('product_option_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  optionId: uuid('option_id')
    .notNull()
    .references(() => productOptions.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 100 }).notNull(),
  normalizedValue: varchar('normalized_value', { length: 100 }).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  colorSwatch: varchar('color_swatch', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('product_option_values_option_val_idx').on(table.optionId, table.normalizedValue),
]);

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  barcode: varchar('barcode', { length: 100 }),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  salePrice: numeric('sale_price', { precision: 10, scale: 2 }),
  priceMinor: integer('price_minor').notNull(),
  salePriceMinor: integer('sale_price_minor'),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  reservedQuantity: integer('reserved_quantity').default(0).notNull(),
  lowStockThreshold: integer('low_stock_threshold').default(5).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  optionCombinationKey: varchar('option_combination_key', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('product_variants_prod_comb_idx').on(table.productId, table.optionCombinationKey),
]);

export const variantOptionValues = pgTable('variant_option_values', {
  variantId: uuid('variant_id')
    .notNull()
    .references(() => productVariants.id, { onDelete: 'cascade' }),
  optionId: uuid('option_id')
    .notNull()
    .references(() => productOptions.id, { onDelete: 'cascade' }),
  optionValueId: uuid('option_value_id')
    .notNull()
    .references(() => productOptionValues.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.variantId, table.optionValueId] }),
]);

// ─── Relations ─────────────────────────────────────────────────────────────────

export const productOptionsRelations = relations(productOptions, ({ one, many }) => ({
  product: one(products, { fields: [productOptions.productId], references: [products.id] }),
  values: many(productOptionValues),
}));

export const productOptionValuesRelations = relations(productOptionValues, ({ one }) => ({
  option: one(productOptions, { fields: [productOptionValues.optionId], references: [productOptions.id] }),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  optionValues: many(variantOptionValues),
}));

export const variantOptionValuesRelations = relations(variantOptionValues, ({ one }) => ({
  variant: one(productVariants, { fields: [variantOptionValues.variantId], references: [productVariants.id] }),
  option: one(productOptions, { fields: [variantOptionValues.optionId], references: [productOptions.id] }),
  optionValue: one(productOptionValues, { fields: [variantOptionValues.optionValueId], references: [productOptionValues.id] }),
}));

export const insertProductOptionSchema = createInsertSchema(productOptions);
export const selectProductOptionSchema = createSelectSchema(productOptions);
export const insertProductVariantSchema = createInsertSchema(productVariants);
export const selectProductVariantSchema = createSelectSchema(productVariants);

export type ProductOption = typeof productOptions.$inferSelect;
export type ProductOptionValue = typeof productOptionValues.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
