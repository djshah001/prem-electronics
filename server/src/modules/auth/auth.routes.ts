import { Router } from 'express';
import { authController } from './auth.controller.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { authenticate } from '../../core/middlewares/authGuard.js';
import { authLimiter } from '../../core/middlewares/rateLimiter.js';

const router = Router();

// Public routes (rate-limited)
router.post('/register', authLimiter, asyncHandler(authController.register));
router.post('/login', authLimiter, asyncHandler(authController.login));
router.post('/verify-otp', authLimiter, asyncHandler(authController.verifyOTP));
router.post('/resend-otp', authLimiter, asyncHandler(authController.resendOTP));
router.post('/forgot-password', authLimiter, asyncHandler(authController.forgotPassword));
router.post('/reset-password', authLimiter, asyncHandler(authController.resetPassword));
router.post('/refresh', authLimiter, asyncHandler(authController.refresh));

// Protected routes
router.get('/me', authenticate, asyncHandler(authController.getMe));
router.post('/logout', asyncHandler(authController.logout));

export default router;
