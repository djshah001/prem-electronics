import Razorpay from 'razorpay';
import { env } from '../../config/env.js';
import { verifyHmacSha256 } from './signature.js';

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
  return verifyHmacSha256(
    env.RAZORPAY_KEY_SECRET,
    `${razorpayOrderId}|${razorpayPaymentId}`,
    razorpaySignature
  );
};

/**
 * Verifies a Razorpay webhook signature
 * @param body - Raw request body (string)
 * @param signature - X-Razorpay-Signature header value
 */
export const verifyWebhookSignature = (body: string, signature: string): boolean => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  return verifyHmacSha256(env.RAZORPAY_WEBHOOK_SECRET, body, signature);
};
