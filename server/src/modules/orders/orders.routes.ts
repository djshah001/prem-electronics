import { Router } from 'express';
import { ordersController } from './orders.controller';
import { asyncHandler } from '../../core/middlewares/asyncHandler';
import { authenticate, adminOnly } from '../../core/middlewares/authGuard';

const router = Router();

// Customer routes
router.post('/', authenticate, asyncHandler(ordersController.createOrder));
router.get('/my', authenticate, asyncHandler(ordersController.getMyOrders));
router.get('/my/:id', authenticate, asyncHandler(ordersController.getMyOrderById));

// Admin routes
router.get('/admin/all', authenticate, ...adminOnly, asyncHandler(ordersController.getOrdersAdmin));
router.post('/bulk-delete', authenticate, ...adminOnly, asyncHandler(ordersController.bulkDelete));
router.get('/', ...adminOnly, asyncHandler(ordersController.getAllOrders));
router.put('/:id/status', ...adminOnly, asyncHandler(ordersController.updateStatus));

export default router;
