import { Router } from 'express';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { authenticate } from '../../core/middlewares/authGuard.js';
import { authLimiter } from '../../core/middlewares/rateLimiter.js';
import { authController } from './auth.controller.js';

const router = Router();

router.post('/otp/request', authLimiter, asyncHandler(authController.requestCustomerOtp));
router.post('/otp/resend', authLimiter, asyncHandler(authController.resendCustomerOtp));
router.post('/otp/verify', authLimiter, asyncHandler(authController.verifyCustomerOtp));
router.post('/otp/cancel', authLimiter, asyncHandler(authController.cancelCustomerOtp));
router.post('/admin/otp/request', authLimiter, asyncHandler(authController.requestAdminOtp));
router.post('/admin/otp/resend', authLimiter, asyncHandler(authController.resendAdminOtp));
router.post('/admin/otp/verify', authLimiter, asyncHandler(authController.verifyAdminOtp));
router.post('/admin/otp/cancel', authLimiter, asyncHandler(authController.cancelAdminOtp));
router.patch('/onboarding', authLimiter, asyncHandler(authController.onboarding));
router.post('/refresh', authLimiter, asyncHandler(authController.refresh));

router.get('/me', authenticate, asyncHandler(authController.getMe));
router.post('/phone-change/request', authenticate, authLimiter, asyncHandler(authController.phoneChangeRequest));
router.post('/phone-change/verify', authenticate, authLimiter, asyncHandler(authController.phoneChangeVerify));
router.post('/phone-change/complete', authenticate, authLimiter, asyncHandler(authController.phoneChangeComplete));
router.post('/logout', asyncHandler(authController.logout));

export default router;
