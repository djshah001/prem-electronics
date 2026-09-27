import { Router } from 'express';
import { productsController } from './products.controller';
import { asyncHandler } from '../../core/middlewares/asyncHandler';
import { adminOnly } from '../../core/middlewares/authGuard';

const router = Router();

// Public routes
router.get('/', asyncHandler(productsController.getProducts));
router.get('/featured', asyncHandler(productsController.getFeatured));
router.get('/id/:id', asyncHandler(productsController.getById));
router.get('/:slug', asyncHandler(productsController.getBySlug));

// Admin only
router.get('/admin/all', ...adminOnly, asyncHandler(productsController.getProductsAdmin));
router.post('/', ...adminOnly, asyncHandler(productsController.create));
router.put('/:id', ...adminOnly, asyncHandler(productsController.update));
router.delete('/:id', ...adminOnly, asyncHandler(productsController.softDelete));
router.patch('/:id/archive', ...adminOnly, asyncHandler(productsController.softDelete));
router.patch('/:id/reactivate', ...adminOnly, asyncHandler(productsController.reactivate));

export default router;
