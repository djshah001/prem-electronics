import { wishlistsRepository } from './wishlists.repository.js';
import { NotFoundError } from '../../core/errors/appError.js';
import { productsRepository } from '../products/products.repository.js';

export const wishlistsService = {
  async getWishlist(userId: string) {
    return wishlistsRepository.findByUser(userId);
  },

  async addToWishlist(userId: string, productId: string) {
    const product = await productsRepository.findById(productId, true);
    if (!product) throw new NotFoundError('Product is not available.');
    return wishlistsRepository.add(userId, productId);
  },

  async removeFromWishlist(userId: string, productId: string) {
    const entry = await wishlistsRepository.findEntry(userId, productId);
    if (!entry) throw new NotFoundError('Item not in wishlist.');
    await wishlistsRepository.remove(userId, productId);
  },

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const entry = await wishlistsRepository.findEntry(userId, productId);
    return !!entry;
  },
};
