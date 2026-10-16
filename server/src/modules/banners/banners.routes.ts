import { Router } from 'express';
import { adminOnly } from '../../core/middlewares/authGuard.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { bannersController } from './banners.controller.js';

export const bannerPublicRouter = Router();
bannerPublicRouter.get('/', asyncHandler(bannersController.publicList));

export const bannerAdminRouter = Router();
bannerAdminRouter.use(adminOnly);
// Literal routes must stay before /:id.
bannerAdminRouter.get('/order', asyncHandler(bannersController.orderList));
bannerAdminRouter.patch('/reorder', asyncHandler(bannersController.reorder));
bannerAdminRouter.get('/settings/home_hero', asyncHandler(bannersController.settings));
bannerAdminRouter.patch('/settings/home_hero', asyncHandler(bannersController.updateSettings));
bannerAdminRouter.get('/', asyncHandler(bannersController.adminList));
bannerAdminRouter.post('/', asyncHandler(bannersController.create));
bannerAdminRouter.get('/:id', asyncHandler(bannersController.detail));
bannerAdminRouter.patch('/:id', asyncHandler(bannersController.update));
bannerAdminRouter.delete('/:id', asyncHandler(bannersController.archive));
