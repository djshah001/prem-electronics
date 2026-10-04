import { z } from 'zod';

const single = (value: unknown) => Array.isArray(value) ? { repeatedQueryParameter: true } : value;
const page = z.preprocess(single, z.coerce.number().int().min(1).default(1));
const limit = z.preprocess(single, z.coerce.number().int().min(1).max(100).default(20));
const search = z.preprocess(single, z.string().trim().max(120).optional());
const sortOrder = z.preprocess(single, z.enum(['asc', 'desc']).default('desc'));
const optionalDate = z.preprocess(single, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

export const customerListQuerySchema = z.object({
  page, limit, search,
  state: z.preprocess(single, z.enum(['active', 'blocked']).optional()),
  sortBy: z.preprocess(single, z.enum(['name', 'email', 'createdAt', 'orderCount', 'netPaidMinor']).default('createdAt')),
  sortOrder,
}).strict();

export const customerOrderQuerySchema = z.object({
  page, limit, search,
  status: z.preprocess(single, z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional()),
  paymentStatus: z.preprocess(single, z.enum(['pending', 'paid', 'failed', 'refunded']).optional()),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  sortBy: z.preprocess(single, z.enum(['orderNumber', 'createdAt', 'total', 'status']).default('createdAt')),
  sortOrder,
}).strict();

export const transactionListQuerySchema = z.object({
  page, limit, search,
  status: z.preprocess(single, z.enum(['created', 'captured', 'failed', 'refunded']).optional()),
  dateFrom: optionalDate,
  dateTo: optionalDate,
  sortBy: z.preprocess(single, z.enum(['createdAt', 'capturedAt', 'amountMinor', 'status']).default('createdAt')),
  sortOrder,
}).strict();

export const reviewListQuerySchema = z.object({
  page, limit, search,
  rating: z.preprocess(single, z.coerce.number().int().min(1).max(5).optional()),
  sortBy: z.preprocess(single, z.enum(['createdAt', 'rating']).default('createdAt')),
  sortOrder,
}).strict();

export const inventoryListQuerySchema = z.object({
  page, limit, search,
  state: z.preprocess(single, z.enum(['low', 'out']).optional()),
  sortBy: z.preprocess(single, z.enum(['title', 'sku', 'availableStock', 'lowStockThreshold']).default('availableStock')),
  sortOrder: z.preprocess(single, z.enum(['asc', 'desc']).default('asc')),
}).strict();

export const inventoryStockSchema = z.object({ stock: z.number().int().min(0).max(10_000_000) }).strict();

export const analyticsQuerySchema = z.object({
  preset: z.preprocess(single, z.enum(['today', 'last7', 'last30', 'month', 'custom']).default('last30')),
  start: optionalDate,
  end: optionalDate,
  timezone: z.preprocess(single, z.literal('Asia/Kolkata').default('Asia/Kolkata')),
  currency: z.preprocess(single, z.string().trim().length(3).transform((value) => value.toUpperCase()).default('INR')),
}).strict().superRefine((value, ctx) => {
  if (value.preset === 'custom' && (!value.start || !value.end)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Custom range requires start and end dates.' });
  }
});

export const uuidParamSchema = z.string().uuid();
export const blockCustomerSchema = z.object({ block: z.boolean() }).strict();

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
export type CustomerOrderQuery = z.infer<typeof customerOrderQuerySchema>;
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;
export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
