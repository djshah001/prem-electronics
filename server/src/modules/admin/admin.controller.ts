import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { sendSuccess, sendNoContent, buildPaginationMeta } from '../../core/utils/responseHandler';

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
};
