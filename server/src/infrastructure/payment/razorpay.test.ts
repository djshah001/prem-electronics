import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { verifyHmacSha256 } from './signature.js';

test('accepts a valid Razorpay callback signature', () => {
  const orderId = 'order_test_123';
  const paymentId = 'pay_test_123';
  const secret = 'unit_test_payment_secret';
  const signature = crypto.createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.equal(verifyHmacSha256(secret, `${orderId}|${paymentId}`, signature), true);
});

test('rejects forged and malformed Razorpay callback signatures', () => {
  const payload = 'order_test_123|pay_test_123';
  assert.equal(verifyHmacSha256('secret', payload, '0'.repeat(64)), false);
  assert.equal(verifyHmacSha256('secret', payload, 'not-hex'), false);
});

test('validates the webhook signature against the exact raw body', () => {
  const body = JSON.stringify({ event: 'payment.captured', payload: { value: 'unchanged' } });
  const secret = 'unit_test_webhook_secret';
  const signature = crypto.createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  assert.equal(verifyHmacSha256(secret, body, signature), true);
  assert.equal(verifyHmacSha256(secret, `${body} `, signature), false);
});
