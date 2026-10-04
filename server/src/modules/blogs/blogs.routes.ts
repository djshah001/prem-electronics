import { Router } from 'express';
import { blogsController } from './blogs.controller.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { adminOnly } from '../../core/middlewares/authGuard.js';

const router = Router();

router.get('/admin', ...adminOnly, asyncHandler(blogsController.getAdmin));
router.get('/admin/stats', ...adminOnly, asyncHandler(blogsController.getStats));
router.get('/admin/:id', ...adminOnly, asyncHandler(blogsController.getAdminById));
router.post('/admin', ...adminOnly, asyncHandler(blogsController.create));
router.put('/admin/:id', ...adminOnly, asyncHandler(blogsController.update));
router.patch('/admin/:id/state', ...adminOnly, asyncHandler(blogsController.changeState));
router.post('/admin/bulk-archive', ...adminOnly, asyncHandler(blogsController.bulkArchive));

router.get('/', asyncHandler(blogsController.getPublic));
router.get('/:slug', asyncHandler(blogsController.getPublishedBySlug));

export default router;
