import { Router } from 'express';
import { usersController } from './users.controller.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { authenticate, adminOnly } from '../../core/middlewares/authGuard.js';

const router = Router();

// Admin routes
router.get('/admin/all', authenticate, ...adminOnly, asyncHandler(usersController.getUsersAdmin));
router.post('/bulk-delete', authenticate, ...adminOnly, asyncHandler(usersController.bulkDelete));

// All user routes require authentication
router.use(authenticate);

router.get('/profile', asyncHandler(usersController.getProfile));
router.put('/profile', asyncHandler(usersController.updateProfile));

router.get('/addresses', asyncHandler(usersController.getAddresses));
router.post('/addresses', asyncHandler(usersController.createAddress));
router.put('/addresses/:id', asyncHandler(usersController.updateAddress));
router.delete('/addresses/:id', asyncHandler(usersController.deleteAddress));

export default router;
