import { Router } from 'express';
import { cartController } from './cart.controller';
import { asyncHandler } from '../../core/middlewares/asyncHandler';

const router = Router();

router.post('/validate', asyncHandler(cartController.validateCart));

export default router;
