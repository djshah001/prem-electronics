import { Router } from 'express';
import { paymentsController } from './payments.controller.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { authenticate } from '../../core/middlewares/authGuard.js';
import { paymentLimiter } from '../../core/middlewares/rateLimiter.js';

const router = Router();
export const paymentsWebhookRouter = Router();

paymentsWebhookRouter.post('/', paymentLimiter, asyncHandler(paymentsController.handleWebhook));

router.post('/verify', authenticate, paymentLimiter, asyncHandler(paymentsController.verifyPayment));

export default router;
