import { Request, Response } from 'express';
import { ordersService } from './orders.service.js';
import { createOrderSchema, updateOrderStatusSchema, orderQuerySchema } from './orders.schema.js';
import { sendSuccess, sendCreated } from '../../core/utils/responseHandler.js';

export const ordersController = {
  async createOrder(req: Request, res: Response) {
    const input = createOrderSchema.parse(req.body);
    const result = await ordersService.createOrder(req.user!.id, input);
    sendCreated(res, result, 'Order created. Proceed with payment.');
  },

  async getMyOrders(req: Request, res: Response) {
    const query = orderQuerySchema.parse(req.query);
    const { data, meta } = await ordersService.getMyOrders(req.user!.id, query);
    sendSuccess(res, data, 'Orders fetched.', 200, meta);
  },

  async getMyOrderById(req: Request, res: Response) {
    const order = await ordersService.getMyOrderById(req.user!.id, req.params.id as string);
    sendSuccess(res, order);
  },

  async getMyInvoice(req: Request, res: Response) {
    const invoice = await ordersService.getInvoice(req.params.id as string, req.user!.id);
    sendSuccess(res, invoice, 'Invoice fetched.');
  },

  async cancelMyOrder(req: Request, res: Response) {
    const order = await ordersService.cancelMyOrder(req.user!.id, req.params.id as string);
    sendSuccess(res, order, order.paymentStatus === 'paid'
      ? 'Order cancelled. For support or payment queries, please contact store support.'
      : 'Order cancelled.');
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async getAllOrders(req: Request, res: Response) {
    const query = orderQuerySchema.parse(req.query);
    const { data, meta } = await ordersService.getAllOrders(query);
    sendSuccess(res, data, 'All orders fetched.', 200, meta);
  },

  async getInvoiceAdmin(req: Request, res: Response) {
    const invoice = await ordersService.getInvoice(req.params.id as string);
    sendSuccess(res, invoice, 'Invoice fetched.');
  },

  async updateStatus(req: Request, res: Response) {
    const input = updateOrderStatusSchema.parse(req.body);
    const order = await ordersService.updateStatus(req.params.id as string, input, req.user!.id);
    sendSuccess(res, order, 'Order status updated.');
  },

  async getOrdersAdmin(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as string | undefined;
    const { data, meta } = await ordersService.getOrdersAdmin({ page, limit, search, sortBy, sortOrder });
    sendSuccess(res, data, 'Admin orders fetched.', 200, meta);
  },

  async bulkDelete(req: Request, res: Response) {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'Invalid IDs array' });
    }
    await ordersService.bulkDelete(ids);
    sendSuccess(res, null, 'Orders deleted successfully.');
  },
};
