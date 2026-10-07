import { Request, Response } from 'express';
import { adminService } from './admin.service.js';
import { sendSuccess, sendNoContent } from '../../core/utils/responseHandler.js';
import { z } from 'zod';
import { adminP2Service } from './admin.p2.service.js';
import {
  analyticsQuerySchema,
  blockCustomerSchema,
  customerListQuerySchema,
  customerOrderQuerySchema,
  inventoryListQuerySchema,
  inventoryStockSchema,
  reviewListQuerySchema,
  transactionListQuerySchema,
  uuidParamSchema,
} from './admin.schema.js';
import { categoryAdminQuerySchema } from '../categories/categories.schema.js';
import { categoriesService } from '../categories/categories.service.js';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100)
    .transform((ids) => [...new Set(ids)]),
});

export const adminController = {
  async getDashboard(req: Request, res: Response) {
    const metrics = await adminService.getDashboardMetrics();
    sendSuccess(res, metrics, 'Dashboard metrics fetched.');
  },

  async getAnalytics(req: Request, res: Response) {
    const query = analyticsQuerySchema.parse(req.query);
    const analytics = await adminP2Service.getAnalytics(query);
    sendSuccess(res, analytics, 'Analytics fetched.');
  },

  async getModuleStats(_req: Request, res: Response) {
    sendSuccess(res, await adminP2Service.getModuleStats(), 'Module statistics fetched.');
  },

  async getLowStock(req: Request, res: Response) {
    const query = inventoryListQuerySchema.parse(req.query);
    const { data, meta } = await adminP2Service.getInventory(query);
    sendSuccess(res, data, 'Low stock variants fetched.', 200, meta);
  },

  async updateStock(req: Request, res: Response) {
    const id = uuidParamSchema.parse(req.params.variantId);
    const { stock } = inventoryStockSchema.parse(req.body);
    sendSuccess(res, await adminP2Service.updateVariantStock(id, stock), 'Variant stock updated.');
  },

  async getCustomers(req: Request, res: Response) {
    const query = customerListQuerySchema.parse(req.query);
    const { data, meta } = await adminP2Service.getCustomers(query);
    sendSuccess(res, data, 'Customers fetched.', 200, meta);
  },

  async getCustomerDetail(req: Request, res: Response) {
    const id = uuidParamSchema.parse(req.params.userId);
    sendSuccess(res, await adminP2Service.getCustomerDetail(id), 'Customer fetched.');
  },

  async getCustomerOrders(req: Request, res: Response) {
    const id = uuidParamSchema.parse(req.params.userId);
    const query = customerOrderQuerySchema.parse(req.query);
    const { data, meta } = await adminP2Service.getCustomerOrders(id, query);
    sendSuccess(res, data, 'Customer orders fetched.', 200, meta);
  },

  async toggleBlockCustomer(req: Request, res: Response) {
    const id = uuidParamSchema.parse(req.params.userId);
    const { block } = blockCustomerSchema.parse(req.body);
    const result = await adminService.toggleBlockCustomer(id, block);
    sendSuccess(res, result, block ? 'Customer blocked.' : 'Customer unblocked.');
  },

  async getPendingReviews(req: Request, res: Response) {
    const query = reviewListQuerySchema.parse(req.query);
    const { data, meta } = await adminP2Service.getPendingReviews(query);
    sendSuccess(res, data, 'Pending reviews fetched.', 200, meta);
  },

  async approveReview(req: Request, res: Response) {
    const review = await adminService.approveReview(uuidParamSchema.parse(req.params.reviewId));
    sendSuccess(res, review, 'Review approved.');
  },

  async rejectReview(req: Request, res: Response) {
    await adminService.rejectReview(uuidParamSchema.parse(req.params.reviewId));
    sendNoContent(res);
  },

  // ─── Bulk Delete ─────────────────────────────────────────────────────────────

  async bulkDeleteProducts(req: Request, res: Response) {
    const { ids } = bulkDeleteSchema.parse(req.body);
    const result = await adminService.bulkDeleteProducts(ids);
    sendSuccess(res, result, `${result.archived} products archived.`);
  },

  async bulkDeleteCategories(req: Request, res: Response) {
    const { ids } = bulkDeleteSchema.parse(req.body);
    const result = await adminService.bulkDeleteCategories(ids);
    sendSuccess(res, result, `${result.archived} categories archived.`);
  },

  async bulkDeleteUsers(req: Request, res: Response) {
    const { ids } = bulkDeleteSchema.parse(req.body);
    const result = await adminService.bulkDeleteUsers(ids);
    sendSuccess(res, result, `${result.blocked} customers blocked.`);
  },

  async bulkDeleteOrders(req: Request, res: Response) {
    const { ids } = bulkDeleteSchema.parse(req.body);
    const result = await adminService.bulkDeleteOrders(ids);
    sendSuccess(res, result, `${result.archived} orders archived.`);
  },

  // ─── Admin Categories ─────────────────────────────────────────────────────

  async getCategoriesAdmin(req: Request, res: Response) {
    const query = categoryAdminQuerySchema.parse(req.query);
    const { data, meta } = await categoriesService.getCategoriesAdmin(query);
    sendSuccess(res, data, 'Categories fetched.', 200, meta);
  },

  // ─── Admin Orders (with filters) ─────────────────────────────────────────

  async getOrdersAdmin(req: Request, res: Response) {
    const query = customerOrderQuerySchema.parse(req.query);
    const { data, meta } = await adminP2Service.getOrders(query);
    sendSuccess(res, data, 'Orders fetched.', 200, meta);
  },

  async getOrderDetail(req: Request, res: Response) {
    const id = uuidParamSchema.parse(req.params.orderId);
    sendSuccess(res, await adminP2Service.getOrderDetail(id), 'Order fetched.');
  },

  async getTransactions(req: Request, res: Response) {
    const query = transactionListQuerySchema.parse(req.query);
    const { data, meta } = await adminP2Service.getTransactions(query);
    sendSuccess(res, data, 'Transactions fetched.', 200, meta);
  },

  async getTransactionDetail(req: Request, res: Response) {
    const id = uuidParamSchema.parse(req.params.transactionId);
    sendSuccess(res, await adminP2Service.getTransactionDetail(id), 'Transaction fetched.');
  },
};
