import { Router } from 'express';
import { blogsController } from './blogs.controller.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { adminOnly } from '../../core/middlewares/authGuard.js';

const router = Router();

// Public
router.get('/', asyncHandler(blogsController.getBlogs));
router.get('/:slug', asyncHandler(blogsController.getBySlug));

// Admin only
router.post('/', ...adminOnly, asyncHandler(blogsController.create));
router.put('/:id', ...adminOnly, asyncHandler(blogsController.update));
router.delete('/:id', ...adminOnly, asyncHandler(blogsController.delete));

export default router;
