import { Router } from 'express';
import { navbarMasterController } from './navbarMaster.controller.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { adminOnly } from '../../core/middlewares/authGuard.js';

const router = Router();

// Public endpoint — fetches only visible items for the storefront navbar
router.get('/', asyncHandler(navbarMasterController.getPublic));

// Admin endpoints — require authentication + admin role
router.get('/admin', ...adminOnly, asyncHandler(navbarMasterController.getAll));
router.post('/reorder', ...adminOnly, asyncHandler(navbarMasterController.reorder));
router.post('/', ...adminOnly, asyncHandler(navbarMasterController.create));
router.put('/:id', ...adminOnly, asyncHandler(navbarMasterController.update));
router.delete('/:id', ...adminOnly, asyncHandler(navbarMasterController.delete));

export default router;
