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
  /** Default product tax rate as a decimal. Configure from the merchant's tax catalogue. */
  TAX_RATE: z.string().default('0.18').transform(Number).refine((value) => Number.isFinite(value) && value >= 0 && value <= 1, 'TAX_RATE must be between 0 and 1.'),
  /** Flat shipping charge in INR minor units (paise)/100 display units. Engineering default: 99 */
  SHIPPING_CHARGE: z.string().default('99').transform(Number).refine((value) => Number.isFinite(value) && value >= 0, 'SHIPPING_CHARGE must be non-negative.'),
  /** Order subtotal (after discount, in display INR) above which shipping is free. Engineering default: 999 */
  SHIPPING_FREE_THRESHOLD: z.string().default('999').transform(Number).refine((value) => Number.isFinite(value) && value >= 0, 'SHIPPING_FREE_THRESHOLD must be non-negative.'),
  TAX_MODE: z.enum(['exclusive', 'inclusive']).default('exclusive'),
  PRICING_POLICY_VERSION: z.string().default('gst-v1'),
  SUPPLIER_STATE_CODE: z.string().regex(/^\d{2}$/).optional(),
  GST_PROVIDER: z.enum(['unconfigured', 'fixture', 'cleartax']).default('unconfigured'),
  GST_PROVIDER_BASE_URL: z.string().url().optional(),
  GST_PROVIDER_AUTH_TOKEN: z.string().optional(),
  GST_PROVIDER_TAXABLE_ENTITY_ID: z.string().optional(),
  GST_LOOKUP_TIMEOUT_MS: z.string().transform(Number).default('8000'),
  GST_VERIFICATION_TTL_HOURS: z.string().transform(Number).default('24'),
  ALLOW_GST_FIXTURES: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  /** Configured merchant details for invoices. Legal fields intentionally have no fabricated defaults. */
  MERCHANT_NAME: z.string().default('Prem Electronics'),
  MERCHANT_GSTIN: z.string().optional(),
  MERCHANT_ADDRESS: z.string().optional(),
  MERCHANT_PHONE: z.string().optional(),
  MERCHANT_EMAIL: z.string().email().optional(),
  MERCHANT_PAN: z.string().optional(),
  MERCHANT_BANK_DETAILS: z.string().optional(),
  MERCHANT_DECLARATION: z.string().optional(),
  MERCHANT_SIGNATURE_LABEL: z.string().default('Authorised Signatory'),
  CAMPAIGN_DELIVERY_ENABLED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  EMAIL_TEST_RECIPIENTS: z.string().default('').transform((value) => value.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)),
  BLOG_IMAGE_HOSTS: z.string().default('images.unsplash.com').transform((value) =>
    value.split(',').map((host) => host.trim().toLowerCase()).filter(Boolean)
  ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV === 'production' && env.GST_PROVIDER === 'fixture') {
  console.error('GST_PROVIDER=fixture is forbidden in production.');
  process.exit(1);
}
