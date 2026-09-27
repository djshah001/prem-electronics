import { reviewsRepository } from './reviews.repository';
import { productsRepository } from '../products/products.repository';
import { AppError, NotFoundError, ConflictError } from '../../core/errors/appError';
import { buildPaginationMeta } from '../../core/utils/responseHandler';
import type { CreateReviewInput, ReviewQuery } from './reviews.schema';

export const reviewsService = {
  async getProductReviews(productId: string, query: ReviewQuery) {
    const { data, total } = await reviewsRepository.findByProduct(productId, query.page, query.limit);
    const meta = buildPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  },

  async createReview(userId: string, productId: string, input: CreateReviewInput) {
    const product = await productsRepository.findById(productId);
    if (!product) throw new NotFoundError('Product not found.');

    const existing = await reviewsRepository.findByUserAndProduct(userId, productId);
    if (existing) throw new ConflictError('You have already reviewed this product.');

    const isVerifiedBuyer = await reviewsRepository.hasUserPurchasedProduct(userId, productId);

    const review = await reviewsRepository.create({
      userId,
      productId,
      rating: input.rating,
      title: input.title,
      body: input.body,
      isVerifiedBuyer,
    });

    // Update product avg rating
    const { avg, count } = await reviewsRepository.getProductAvgRating(productId);
    await productsRepository.updateRating(productId, Number(avg.toFixed(2)), count);

    return review;
  },
};
