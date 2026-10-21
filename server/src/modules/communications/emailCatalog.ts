import { documentFromPlainContent } from './contentDocument.js';

export const EMAIL_EVENT_CATALOG = {
  welcome: { name: 'Welcome', category: 'transactional', subject: 'Welcome to Prem Electronics, {{customerName}}', required: ['customerName'], document: documentFromPlainContent('Welcome to Prem Electronics', ['Hi {{customerName}},', 'Your account is ready. We are glad to have you here.']) },
  otp_verification: { name: 'OTP verification', category: 'auth', subject: '{{otp}} is your Prem Electronics verification code', required: ['customerName', 'otp'], document: documentFromPlainContent('Verify your email address', ['Hi {{customerName}},', 'Your one-time verification code is {{otp}}. It expires in 10 minutes.']) },
  password_reset: { name: 'Password reset', category: 'auth', subject: 'Reset your Prem Electronics password', required: ['customerName', 'resetUrl'], document: documentFromPlainContent('Reset your password', ['Hi {{customerName}},', 'Use the secure button below to choose a new password. The link expires in one hour.'], { text: 'Reset password', href: '{{resetUrl}}' }) },
  order_confirmed: { name: 'Order confirmed and invoice', category: 'transactional', subject: 'Order {{orderNumber}} confirmed', required: ['customerName', 'orderNumber', 'orderTotal'], document: documentFromPlainContent('Order confirmed', ['Hi {{customerName}},', 'We received order {{orderNumber}} for {{orderTotal}}. Your tax invoice is attached.']) },
  payment_failed: { name: 'Payment failed', category: 'transactional', subject: 'Payment unsuccessful for order {{orderNumber}}', required: ['customerName', 'orderNumber'], document: documentFromPlainContent('Payment unsuccessful', ['Hi {{customerName}},', 'We could not confirm payment for order {{orderNumber}}. No successful charge is recorded.']) },
  shipment: { name: 'Shipment update', category: 'transactional', subject: 'Order {{orderNumber}} has shipped', required: ['customerName', 'orderNumber'], document: documentFromPlainContent('Your order has shipped', ['Hi {{customerName}},', 'Order {{orderNumber}} is on its way.']) },
  delivery: { name: 'Delivery confirmation', category: 'transactional', subject: 'Order {{orderNumber}} delivered', required: ['customerName', 'orderNumber'], document: documentFromPlainContent('Delivered', ['Hi {{customerName}},', 'Order {{orderNumber}} has been marked delivered.']) },
  cancellation: { name: 'Cancellation', category: 'transactional', subject: 'Order {{orderNumber}} cancelled', required: ['customerName', 'orderNumber'], document: documentFromPlainContent('Order cancelled', ['Hi {{customerName}},', 'Order {{orderNumber}} has been cancelled.']) },
  promotion: { name: 'Promotion', category: 'marketing', subject: '{{campaignSubject}}', required: ['customerName', 'campaignSubject', 'unsubscribeUrl'], document: documentFromPlainContent('{{campaignSubject}}', ['Hi {{customerName}},', '{{campaignMessage}}', 'You can change your marketing preference at any time.'], { text: 'Unsubscribe', href: '{{unsubscribeUrl}}' }) },
} as const;

export type EmailEventKey = keyof typeof EMAIL_EVENT_CATALOG;

