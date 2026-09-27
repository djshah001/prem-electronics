import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../../config/env';

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

/**
 * Verifies Razorpay payment signature using HMAC-SHA256.
 * @param razorpayOrderId  - The order ID returned by Razorpay
 * @param razorpayPaymentId - The payment ID from the frontend callback
 * @param razorpaySignature - The signature from the frontend callback
 */
export const verifyPaymentSignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(razorpaySignature, 'hex')
  );
};

/**
 * Verifies a Razorpay webhook signature
 * @param body - Raw request body (string)
 * @param signature - X-Razorpay-Signature header value
 */
export const verifyWebhookSignature = (body: string, signature: string): boolean => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );
};
