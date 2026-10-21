import { reviewsRepository } from './reviews.repository.js';
import { productsRepository } from '../products/products.repository.js';
import { AppError, NotFoundError, ConflictError, ForbiddenError } from '../../core/errors/appError.js';
import { buildPaginationMeta } from '../../core/utils/responseHandler.js';
import type { CreateReviewInput, ReviewQuery } from './reviews.schema.js';

export const reviewsService = {
  /** Public: returns only approved reviews */
  async getProductReviews(productId: string, query: ReviewQuery) {
    const { data, total } = await reviewsRepository.findByProduct(productId, query.page, query.limit);
    const meta = buildPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  },

  /** Returns the authenticated user's own review (pending or approved) */
  async getMyReview(userId: string, productId: string) {
    return reviewsRepository.findByUserAndProduct(userId, productId);
  },

  async createReview(userId: string, productId: string, input: CreateReviewInput) {
    const product = await productsRepository.findById(productId);
    if (!product) throw new NotFoundError('Product not found.');

    const existing = await reviewsRepository.findByUserAndProduct(userId, productId);
    if (existing) throw new ConflictError('You have already reviewed this product.');

    const isVerifiedBuyer = await reviewsRepository.hasUserPurchasedProduct(userId, productId);
    if (!isVerifiedBuyer) {
      throw new AppError('You can only review products you have purchased and received.', 403);
    }

    const review = await reviewsRepository.create({
      userId,
      productId,
      rating: input.rating,
      title: input.title,
      body: input.body,
      isVerifiedBuyer,
      // New reviews start pending; approved reviews reopen to pending after content edit
      isApproved: false,
    }, product.title);

    // Rating aggregate is not updated until approved
    return review;
  },

  async updateReview(userId: string, reviewId: string, input: Partial<CreateReviewInput>) {
    const review = await reviewsRepository.findById(reviewId);
    if (!review) throw new NotFoundError('Review not found.');
    if (review.userId !== userId) throw new ForbiddenError();

    // Edited content returns to pending moderation
    const updated = await reviewsRepository.update(reviewId, {
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.body !== undefined && { body: input.body }),
      isApproved: false, // back to pending
    });

    // If it was previously approved, recompute rating (approved count decreases by one)
    if (review.isApproved) {
      await reviewsRepository.recomputeProductRating(review.productId);
    }

    return updated;
  },

  /** Admin: approve a review and recompute product rating */
  async approveReview(reviewId: string) {
    const review = await reviewsRepository.findById(reviewId);
    if (!review) throw new NotFoundError('Review not found.');
    const approved = await reviewsRepository.approve(reviewId);
    await reviewsRepository.recomputeProductRating(review.productId);
    return approved;
  },

  /** Admin: reject (delete) a review and recompute product rating */
  async rejectReview(reviewId: string) {
    const review = await reviewsRepository.findById(reviewId);
    if (!review) throw new NotFoundError('Review not found.');
    await reviewsRepository.reject(reviewId);
    await reviewsRepository.recomputeProductRating(review.productId);
  },
};
