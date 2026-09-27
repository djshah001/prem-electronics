import { Router } from 'express';
import { couponsController } from './coupons.controller';
import { asyncHandler } from '../../core/middlewares/asyncHandler';
import { adminOnly, authenticate } from '../../core/middlewares/authGuard';

const router = Router();

// Customer: validate coupon
router.post('/validate', authenticate, asyncHandler(couponsController.validate));

// Admin CRUD
router.get('/', ...adminOnly, asyncHandler(couponsController.getAll));
router.post('/', ...adminOnly, asyncHandler(couponsController.create));
router.put('/:id', ...adminOnly, asyncHandler(couponsController.update));
router.delete('/:id', ...adminOnly, asyncHandler(couponsController.delete));

export default router;
