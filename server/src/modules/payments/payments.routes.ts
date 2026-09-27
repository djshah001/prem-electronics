import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { asyncHandler } from '../../core/middlewares/asyncHandler';
import { authenticate } from '../../core/middlewares/authGuard';
import { paymentLimiter } from '../../core/middlewares/rateLimiter';

const router = Router();

router.post('/verify', authenticate, paymentLimiter, asyncHandler(paymentsController.verifyPayment));

export default router;
