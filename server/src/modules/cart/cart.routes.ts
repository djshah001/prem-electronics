import { Router } from 'express';
import { cartController } from './cart.controller.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { authenticate } from '../../core/middlewares/authGuard.js';

const router = Router();

router.post('/validate', authenticate, asyncHandler(cartController.validateCart));
router.get('/', authenticate, asyncHandler(cartController.getCart));
router.post('/merge', authenticate, asyncHandler(cartController.mergeCart));
router.post('/items', authenticate, asyncHandler(cartController.addItem));
router.patch('/items/:productId', authenticate, asyncHandler(cartController.updateItem));
router.delete('/items/:productId', authenticate, asyncHandler(cartController.removeItem));
router.delete('/', authenticate, asyncHandler(cartController.clearCart));

export default router;
