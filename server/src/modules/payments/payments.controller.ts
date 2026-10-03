import { Request, Response } from 'express';
import { paymentsService } from './payments.service.js';
import { verifyPaymentSchema } from './payments.schema.js';
import { sendSuccess } from '../../core/utils/responseHandler.js';

export const paymentsController = {
  async verifyPayment(req: Request, res: Response) {
    const input = verifyPaymentSchema.parse(req.body);
    const result = await paymentsService.verifyAndComplete(req.user!.id, input);
    sendSuccess(res, result, 'Payment verified successfully. Order confirmed!');
  },

  async handleWebhook(req: Request, res: Response) {
    if (!Buffer.isBuffer(req.body)) throw new Error('Webhook raw body is unavailable.');
    const signature = req.get('x-razorpay-signature');
    if (!signature) return res.status(400).json({ success: false, message: 'Missing webhook signature.' });
    const result = await paymentsService.handleWebhook(
      req.body,
      signature,
      req.get('x-razorpay-event-id') ?? undefined
    );
    sendSuccess(res, result, 'Webhook processed.');
  },
};
