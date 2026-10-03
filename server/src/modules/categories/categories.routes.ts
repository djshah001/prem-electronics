import { Router } from 'express';
import { categoriesController } from './categories.controller.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { adminOnly } from '../../core/middlewares/authGuard.js';

const router = Router();

// Public
router.get('/', asyncHandler(categoriesController.getTree));
router.get('/:slug', asyncHandler(categoriesController.getBySlug));

// Admin only
router.get('/admin/all', ...adminOnly, asyncHandler(categoriesController.getCategoriesAdmin));
router.post('/bulk-delete', ...adminOnly, asyncHandler(categoriesController.bulkDelete));
router.post('/', ...adminOnly, asyncHandler(categoriesController.create));
router.put('/:id', ...adminOnly, asyncHandler(categoriesController.update));
router.delete('/:id', ...adminOnly, asyncHandler(categoriesController.delete));

export default router;
