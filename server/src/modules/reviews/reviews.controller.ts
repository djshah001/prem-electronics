import { Request, Response } from 'express';
import { reviewsService } from './reviews.service';
import { createReviewSchema, reviewQuerySchema } from './reviews.schema';
import { sendSuccess, sendCreated } from '../../core/utils/responseHandler';

export const reviewsController = {
  async getProductReviews(req: Request, res: Response) {
    const query = reviewQuerySchema.parse(req.query);
    const { data, meta } = await reviewsService.getProductReviews((req.params.productId as string), query);
    sendSuccess(res, data, 'Reviews fetched.', 200, meta);
  },

  async createReview(req: Request, res: Response) {
    const input = createReviewSchema.parse(req.body);
    const review = await reviewsService.createReview(req.user!.id, (req.params.productId as string), input);
    sendCreated(res, review, 'Review submitted successfully.');
  },
};
