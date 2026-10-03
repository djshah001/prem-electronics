import { Request, Response } from 'express';
import { wishlistsService } from './wishlists.service.js';
import { sendSuccess, sendNoContent } from '../../core/utils/responseHandler.js';

export const wishlistsController = {
  async getWishlist(req: Request, res: Response) {
    const items = await wishlistsService.getWishlist(req.user!.id);
    sendSuccess(res, items, 'Wishlist fetched.');
  },

  async addToWishlist(req: Request, res: Response) {
    const item = await wishlistsService.addToWishlist(req.user!.id, (req.params.productId as string));
    sendSuccess(res, item, 'Added to wishlist.');
  },

  async removeFromWishlist(req: Request, res: Response) {
    await wishlistsService.removeFromWishlist(req.user!.id, (req.params.productId as string));
    sendNoContent(res);
  },
};
