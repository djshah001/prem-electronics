import { Router } from 'express';
import { productsController } from './products.controller.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { adminOnly } from '../../core/middlewares/authGuard.js';

const router = Router();

// Public routes
router.get('/', asyncHandler(productsController.getProducts));
router.get('/featured', asyncHandler(productsController.getFeatured));
router.get('/id/:id', asyncHandler(productsController.getById));
router.get('/:id/variants', asyncHandler(productsController.getVariants));
router.get('/:slug', asyncHandler(productsController.getBySlug));

// Admin only
router.get('/admin/all', ...adminOnly, asyncHandler(productsController.getProductsAdmin));
router.post('/bulk-delete', ...adminOnly, asyncHandler(productsController.bulkDelete));
router.post('/', ...adminOnly, asyncHandler(productsController.create));
router.put('/:id', ...adminOnly, asyncHandler(productsController.update));
router.put('/:id/variants', ...adminOnly, asyncHandler(productsController.saveVariants));
router.delete('/:id', ...adminOnly, asyncHandler(productsController.softDelete));
router.patch('/:id/archive', ...adminOnly, asyncHandler(productsController.softDelete));
router.patch('/:id/reactivate', ...adminOnly, asyncHandler(productsController.reactivate));

export default router;
