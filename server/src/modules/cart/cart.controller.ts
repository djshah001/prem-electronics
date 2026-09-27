import { Request, Response } from 'express';
import { cartService } from './cart.service';
import { validateCartSchema } from './cart.schema';
import { sendSuccess } from '../../core/utils/responseHandler';

export const cartController = {
  async validateCart(req: Request, res: Response) {
    const input = validateCartSchema.parse(req.body);
    const result = await cartService.validateCart(input);
    sendSuccess(res, result, 'Cart validated successfully.');
  },
};
