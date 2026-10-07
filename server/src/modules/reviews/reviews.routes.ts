import { Router } from 'express';
import { reviewsController } from './reviews.controller.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { authenticate } from '../../core/middlewares/authGuard.js';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(reviewsController.getProductReviews));
router.get('/mine', authenticate, asyncHandler(reviewsController.getMyReview));
router.post('/', authenticate, asyncHandler(reviewsController.createReview));

export default router;
