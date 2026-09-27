import { Router } from 'express';
import { reviewsController } from './reviews.controller';
import { asyncHandler } from '../../core/middlewares/asyncHandler';
import { authenticate } from '../../core/middlewares/authGuard';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(reviewsController.getProductReviews));
router.post('/', authenticate, asyncHandler(reviewsController.createReview));

export default router;
