import { Request, Response } from 'express';
import { reviewsService } from './reviews.service.js';
import { createReviewSchema, reviewQuerySchema } from './reviews.schema.js';
import { sendSuccess, sendCreated } from '../../core/utils/responseHandler.js';

export const reviewsController = {
  async getProductReviews(req: Request, res: Response) {
    const query = reviewQuerySchema.parse(req.query);
    const { data, meta } = await reviewsService.getProductReviews((req.params.productId as string), query);
    sendSuccess(res, data, 'Reviews fetched.', 200, meta);
  },

  /** Returns the current user's own review (any approval status) for this product */
  async getMyReview(req: Request, res: Response) {
    const review = await reviewsService.getMyReview(req.user!.id, req.params.productId as string);
    sendSuccess(res, review ?? null, 'Review fetched.');
  },

  async createReview(req: Request, res: Response) {
    const input = createReviewSchema.parse(req.body);
    const review = await reviewsService.createReview(req.user!.id, (req.params.productId as string), input);
    sendCreated(res, review, 'Review submitted. It will appear after approval.');
  },
};
