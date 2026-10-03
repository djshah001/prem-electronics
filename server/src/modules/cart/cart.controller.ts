import { Request, Response } from 'express';
import { cartService } from './cart.service.js';
import { mergeCartSchema, setCartItemSchema, updateCartItemSchema, validateCartSchema } from './cart.schema.js';
import { sendSuccess, sendNoContent } from '../../core/utils/responseHandler.js';

export const cartController = {
  async getCart(req: Request, res: Response) {
    sendSuccess(res, await cartService.getCart(req.user!.id), 'Cart fetched successfully.');
  },
  async mergeCart(req: Request, res: Response) {
    const input = mergeCartSchema.parse(req.body);
    sendSuccess(res, await cartService.mergeCart(req.user!.id, input.items), 'Guest cart merged successfully.');
  },
  async addItem(req: Request, res: Response) {
    const input = setCartItemSchema.parse(req.body);
    sendSuccess(res, await cartService.addItem(req.user!.id, input.productId, input.quantity, input.variantId), 'Cart updated successfully.');
  },
  async updateItem(req: Request, res: Response) {
    const input = updateCartItemSchema.parse(req.body);
    sendSuccess(res, await cartService.updateItem(req.user!.id, req.params.productId as string, input.quantity), 'Cart updated successfully.');
  },
  async removeItem(req: Request, res: Response) {
    sendSuccess(res, await cartService.removeItem(req.user!.id, req.params.productId as string), 'Item removed from cart.');
  },
  async clearCart(req: Request, res: Response) {
    await cartService.clearCart(req.user!.id);
    sendNoContent(res);
  },
  async validateCart(req: Request, res: Response) {
    const input = validateCartSchema.parse(req.body);
    const result = await cartService.validateCart(input, req.user!.id);
    sendSuccess(res, result, 'Cart validated successfully.');
  },
};
