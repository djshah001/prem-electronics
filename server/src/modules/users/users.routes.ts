import { Router } from 'express';
import { usersController } from './users.controller';
import { asyncHandler } from '../../core/middlewares/asyncHandler';
import { authenticate } from '../../core/middlewares/authGuard';

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/profile', asyncHandler(usersController.getProfile));
router.put('/profile', asyncHandler(usersController.updateProfile));

router.get('/addresses', asyncHandler(usersController.getAddresses));
router.post('/addresses', asyncHandler(usersController.createAddress));
router.put('/addresses/:id', asyncHandler(usersController.updateAddress));
router.delete('/addresses/:id', asyncHandler(usersController.deleteAddress));

export default router;
