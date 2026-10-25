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
  AUTH_TOKEN_VERSION: z.string().min(1).default('otp-v1'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  OTP_AUTH_ENABLED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  OTP_PROVIDER: z.enum(['msg91', 'fake']).default('fake'),
  MSG91_AUTHKEY: z.string().min(1).optional(),
  MSG91_WIDGET_ID: z.string().min(1).optional(),
  OTP_BINDING_SECRET: z.string().min(32).optional(),
  OTP_FAKE_CODE: z.string().regex(/^\d{6}$/).default('654321'),
  OTP_LIFETIME_SECONDS: z.string().transform(Number).default('300').pipe(z.number().int().min(60).max(900)),
  OTP_RESEND_COOLDOWN_SECONDS: z.string().transform(Number).default('60').pipe(z.number().int().min(10).max(600)),
  OTP_MAX_ATTEMPTS: z.string().transform(Number).default('5').pipe(z.number().int().min(1).max(10)),
  OTP_MAX_RESENDS: z.string().transform(Number).default('3').pipe(z.number().int().min(0).max(10)),
  OTP_PHONE_SENDS_PER_15_MINUTES: z.string().transform(Number).default('3').pipe(z.number().int().min(1).max(20)),
  OTP_PHONE_SENDS_PER_DAY: z.string().transform(Number).default('10').pipe(z.number().int().min(1).max(100)),
  OTP_IP_SENDS_PER_15_MINUTES: z.string().transform(Number).default('20').pipe(z.number().int().min(1).max(200)),
  OTP_GLOBAL_SENDS_PER_HOUR: z.string().transform(Number).default('500').pipe(z.number().int().min(1)),
  OTP_PROVIDER_TIMEOUT_MS: z.string().transform(Number).default('8000').pipe(z.number().int().min(1000).max(30000)),
  AUTH_ALLOWED_COUNTRIES: z.string().default('IN').transform((value) => value.split(',').map((country) => country.trim().toUpperCase()).filter(Boolean)),
  MESSAGE_PROVIDER: z.enum(['msg91', 'fake']).default('fake'),
  TRANSACTIONAL_MESSAGING_ENABLED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  WHATSAPP_CAMPAIGN_DELIVERY_ENABLED: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  MSG91_SMS_WELCOME_TEMPLATE_ID: z.string().min(1).optional(),
  MSG91_WHATSAPP_INTEGRATED_NUMBER: z.string().regex(/^\d{8,15}$/).optional(),
  MSG91_WHATSAPP_WELCOME_TEMPLATE_NAME: z.string().min(1).optional(),
  MSG91_WHATSAPP_LANGUAGE: z.string().min(2).max(20).default('en'),
  MSG91_MESSAGE_TIMEOUT_MS: z.string().transform(Number).default('8000').pipe(z.number().int().min(1000).max(30000)),
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

if (env.NODE_ENV === 'production' && env.OTP_PROVIDER === 'fake') {
  console.error('OTP_PROVIDER=fake is forbidden in production.');
  process.exit(1);
}

if (env.OTP_AUTH_ENABLED && env.OTP_PROVIDER === 'msg91' && (!env.MSG91_AUTHKEY || !env.MSG91_WIDGET_ID)) {
  console.error('MSG91_AUTHKEY and MSG91_WIDGET_ID are required when OTP_PROVIDER=msg91.');
  process.exit(1);
}

if (env.NODE_ENV === 'production' && (env.TRANSACTIONAL_MESSAGING_ENABLED || env.WHATSAPP_CAMPAIGN_DELIVERY_ENABLED) && env.MESSAGE_PROVIDER === 'fake') {
  console.error('MESSAGE_PROVIDER=fake cannot be used for enabled production messaging.');
  process.exit(1);
}

if (env.MESSAGE_PROVIDER === 'msg91' && (env.TRANSACTIONAL_MESSAGING_ENABLED || env.WHATSAPP_CAMPAIGN_DELIVERY_ENABLED) && (!env.MSG91_AUTHKEY || !env.MSG91_WHATSAPP_INTEGRATED_NUMBER)) {
  console.error('MSG91_AUTHKEY and MSG91_WHATSAPP_INTEGRATED_NUMBER are required for enabled MSG91 messaging.');
  process.exit(1);
}

if (env.TRANSACTIONAL_MESSAGING_ENABLED && (!env.MSG91_SMS_WELCOME_TEMPLATE_ID || !env.MSG91_WHATSAPP_WELCOME_TEMPLATE_NAME)) {
  console.error('MSG91 SMS and WhatsApp welcome templates are required when transactional messaging is enabled.');
  process.exit(1);
}
