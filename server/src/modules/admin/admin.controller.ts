import { Request, Response } from 'express';
import { adminService } from './admin.service.js';
import { sendSuccess, sendNoContent, buildPaginationMeta } from '../../core/utils/responseHandler.js';
import { z } from 'zod';

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
    const period = Number(req.query.period) || 30;
    const analytics = await adminService.getAnalytics(period);
    sendSuccess(res, analytics, 'Analytics fetched.');
  },

  async getLowStock(req: Request, res: Response) {
    const threshold = req.query.threshold ? Number(req.query.threshold) : undefined;
    const items = await adminService.getLowStock(threshold);
    sendSuccess(res, items, 'Low stock items fetched.');
  },

  async updateStock(req: Request, res: Response) {
    const { stock } = req.body;
    const product = await adminService.updateStock((req.params.productId as string), Number(stock));
    sendSuccess(res, product, 'Stock updated.');
  },

  async getCustomers(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const { data, total } = await adminService.getCustomers(page, limit, search);
    const meta = buildPaginationMeta(page, limit, total);
    sendSuccess(res, data, 'Customers fetched.', 200, meta);
  },

  async toggleBlockCustomer(req: Request, res: Response) {
    const { block } = req.body;
    const result = await adminService.toggleBlockCustomer((req.params.userId as string), Boolean(block));
    sendSuccess(res, result, block ? 'Customer blocked.' : 'Customer unblocked.');
  },

  async getPendingReviews(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { data, total } = await adminService.getPendingReviews(page, limit);
    const meta = buildPaginationMeta(page, limit, total);
    sendSuccess(res, data, 'Pending reviews fetched.', 200, meta);
  },

  async approveReview(req: Request, res: Response) {
    const review = await adminService.approveReview((req.params.reviewId as string));
    sendSuccess(res, review, 'Review approved.');
  },

  async rejectReview(req: Request, res: Response) {
    await adminService.rejectReview((req.params.reviewId as string));
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
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const { data, total } = await adminService.getCategoriesAdmin(page, limit, search);
    const meta = buildPaginationMeta(page, limit, total);
    sendSuccess(res, data, 'Categories fetched.', 200, meta);
  },

  // ─── Admin Orders (with filters) ─────────────────────────────────────────

  async getOrdersAdmin(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
    const { data, total } = await adminService.getOrdersAdmin(page, limit, search, status, sortBy, sortOrder);
    const meta = buildPaginationMeta(page, limit, total);
    sendSuccess(res, data, 'Orders fetched.', 200, meta);
  },
};
