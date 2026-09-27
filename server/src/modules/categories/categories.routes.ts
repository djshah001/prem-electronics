import { Router } from 'express';
import { categoriesController } from './categories.controller';
import { asyncHandler } from '../../core/middlewares/asyncHandler';
import { adminOnly } from '../../core/middlewares/authGuard';

const router = Router();

// Public
router.get('/', asyncHandler(categoriesController.getTree));
router.get('/:slug', asyncHandler(categoriesController.getBySlug));

// Admin only
router.post('/', ...adminOnly, asyncHandler(categoriesController.create));
router.put('/:id', ...adminOnly, asyncHandler(categoriesController.update));
router.delete('/:id', ...adminOnly, asyncHandler(categoriesController.delete));

export default router;
