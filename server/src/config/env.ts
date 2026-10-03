import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.string().transform(Number).default('30'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  ALLOW_MOCK_PAYMENTS: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string().email(),
  /** Inclusive tax rate as a decimal, e.g. '0.18' for 18% GST. Engineering default: 0.18 */
  TAX_RATE: z.string().transform(Number).default('0.18'),
  /** Flat shipping charge in INR minor units (paise)/100 display units. Engineering default: 99 */
  SHIPPING_CHARGE: z.string().transform(Number).default('99'),
  /** Order subtotal (after discount, in display INR) above which shipping is free. Engineering default: 999 */
  SHIPPING_FREE_THRESHOLD: z.string().transform(Number).default('999'),
  /** Configured Merchant details for Invoices and Receipts */
  MERCHANT_NAME: z.string().default('Prem Electronics'),
  MERCHANT_GSTIN: z.string().default('27AABCP1234F1Z5'),
  MERCHANT_ADDRESS: z.string().default('123 Electronic Market, Station Road, Mumbai, Maharashtra 400001'),
  MERCHANT_PHONE: z.string().default('+91 98765 43210'),
  MERCHANT_EMAIL: z.string().email().default('support@premelectronics.com'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
