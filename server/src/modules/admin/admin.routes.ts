import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { adminOnly } from '../../core/middlewares/authGuard.js';

const router = Router();

router.use(...adminOnly);

// Dashboard & Analytics
router.get('/dashboard', asyncHandler(adminController.getDashboard));
router.get('/analytics', asyncHandler(adminController.getAnalytics));
router.get('/stats', asyncHandler(adminController.getModuleStats));

// Inventory / Low Stock
router.get('/inventory/low-stock', asyncHandler(adminController.getLowStock));
router.patch('/inventory/:variantId/stock', asyncHandler(adminController.updateStock));

// Customer Management
router.get('/customers', asyncHandler(adminController.getCustomers));
router.get('/customers/:userId/orders', asyncHandler(adminController.getCustomerOrders));
router.get('/customers/:userId', asyncHandler(adminController.getCustomerDetail));
router.patch('/customers/:userId/block', asyncHandler(adminController.toggleBlockCustomer));
router.post('/customers/bulk-delete', asyncHandler(adminController.bulkDeleteUsers));

// Review Moderation
router.get('/reviews/pending', asyncHandler(adminController.getPendingReviews));
router.patch('/reviews/:reviewId/approve', asyncHandler(adminController.approveReview));
router.delete('/reviews/:reviewId/reject', asyncHandler(adminController.rejectReview));

// Bulk Delete Endpoints
router.post('/products/bulk-delete', asyncHandler(adminController.bulkDeleteProducts));
router.post('/categories/bulk-delete', asyncHandler(adminController.bulkDeleteCategories));
router.post('/orders/bulk-delete', asyncHandler(adminController.bulkDeleteOrders));

// Admin-level Categories (server-side table ops)
router.get('/categories', asyncHandler(adminController.getCategoriesAdmin));

// Admin-level Orders (server-side table ops)
router.get('/orders', asyncHandler(adminController.getOrdersAdmin));
router.get('/orders/:orderId', asyncHandler(adminController.getOrderDetail));

router.get('/transactions', asyncHandler(adminController.getTransactions));
router.get('/transactions/:transactionId', asyncHandler(adminController.getTransactionDetail));

export default router;
