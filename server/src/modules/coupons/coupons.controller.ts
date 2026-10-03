import { Request, Response } from 'express';
import { couponsService } from './coupons.service.js';
import { createCouponSchema, updateCouponSchema, validateCouponSchema } from './coupons.schema.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../core/utils/responseHandler.js';

export const couponsController = {
  async getAll(req: Request, res: Response) {
    const coupons = await couponsService.getAll();
    sendSuccess(res, coupons);
  },

  async validate(req: Request, res: Response) {
    const input = validateCouponSchema.parse(req.body);
    const result = await couponsService.validate(input);
    sendSuccess(res, result, 'Coupon is valid.');
  },

  async create(req: Request, res: Response) {
    const input = createCouponSchema.parse(req.body);
    const coupon = await couponsService.create(input);
    sendCreated(res, coupon, 'Coupon created successfully.');
  },

  async update(req: Request, res: Response) {
    const input = updateCouponSchema.parse(req.body);
    const coupon = await couponsService.update((req.params.id as string), input);
    sendSuccess(res, coupon, 'Coupon updated successfully.');
  },

  async delete(req: Request, res: Response) {
    await couponsService.delete((req.params.id as string));
    sendNoContent(res);
  },
};
