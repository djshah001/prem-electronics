import { Request, Response } from 'express';
import { paymentsService } from './payments.service';
import { verifyPaymentSchema } from './payments.schema';
import { sendSuccess } from '../../core/utils/responseHandler';

export const paymentsController = {
  async verifyPayment(req: Request, res: Response) {
    const input = verifyPaymentSchema.parse(req.body);
    const result = await paymentsService.verifyAndComplete(input);
    sendSuccess(res, result, 'Payment verified successfully. Order confirmed!');
  },
};
