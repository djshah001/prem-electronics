import { Router } from 'express';
import { ordersController } from './orders.controller.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { authenticate, adminOnly } from '../../core/middlewares/authGuard.js';

const router = Router();

// ─── Customer routes ───────────────────────────────────────────────────────────
router.post('/', authenticate, asyncHandler(ordersController.createOrder));
router.get('/my', authenticate, asyncHandler(ordersController.getMyOrders));
router.get('/my/:id', authenticate, asyncHandler(ordersController.getMyOrderById));
router.get('/my/:id/invoice', authenticate, asyncHandler(ordersController.getMyInvoice));
router.patch('/my/:id/cancel', authenticate, asyncHandler(ordersController.cancelMyOrder));

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get('/admin/all', authenticate, ...adminOnly, asyncHandler(ordersController.getOrdersAdmin));
router.post('/bulk-delete', authenticate, ...adminOnly, asyncHandler(ordersController.bulkDelete));
router.get('/', ...adminOnly, asyncHandler(ordersController.getAllOrders));
router.get('/:id/invoice', ...adminOnly, asyncHandler(ordersController.getInvoiceAdmin));
router.put('/:id/status', ...adminOnly, asyncHandler(ordersController.updateStatus));

export default router;
