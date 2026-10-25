import crypto from 'crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';

export type OtpProviderErrorCode = 'incorrect_code' | 'expired' | 'already_used' | 'unavailable' | 'invalid_response';

export class OtpProviderError extends Error {
  constructor(public readonly code: OtpProviderErrorCode, message: string) {
    super(message);
  }
}

export interface OtpProvider {
  readonly family: 'msg91_widget' | 'fake';
  send(identifier: string): Promise<{ requestRef: string }>;
  retry(requestRef: string): Promise<void>;
  verify(requestRef: string, code: string): Promise<{ verifiedIdentifier: string }>;
}

const providerResponseSchema = z.object({
  type: z.string(),
  message: z.string(),
  code: z.union([z.string(), z.number()]).optional(),
}).passthrough();

const classifyFailure = (body: unknown): OtpProviderError => {
  const text = JSON.stringify(body).toLowerCase();
  if (text.includes('already') && text.includes('verif')) return new OtpProviderError('already_used', 'OTP proof was already used.');
  if (text.includes('expir')) return new OtpProviderError('expired', 'OTP has expired.');
  if (text.includes('invalid') || text.includes('incorrect') || text.includes('mismatch')) return new OtpProviderError('incorrect_code', 'Incorrect OTP.');
  return new OtpProviderError('unavailable', 'OTP provider rejected the request.');
};

const requestMsg91 = async (path: string, body: Record<string, string>) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.OTP_PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(`https://control.msg91.com/api/v5/widget/${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authkey: env.MSG91_AUTHKEY!,
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    if (text.length > 32_768) throw new OtpProviderError('invalid_response', 'OTP provider response was too large.');
    let json: unknown;
    try { json = JSON.parse(text); } catch { throw new OtpProviderError('invalid_response', 'OTP provider returned malformed JSON.'); }
    const parsed = providerResponseSchema.safeParse(json);
    if (!response.ok || !parsed.success || parsed.data.type.toLowerCase() !== 'success' || String(parsed.data.code ?? '') === '201') {
      throw classifyFailure(json);
    }
    return parsed.data.message;
  } catch (error) {
    if (error instanceof OtpProviderError) throw error;
    throw new OtpProviderError('unavailable', error instanceof Error && error.name === 'AbortError'
      ? 'OTP provider timed out; delivery is unknown.'
      : 'OTP provider is unavailable.');
  } finally {
    clearTimeout(timer);
  }
};

export class Msg91WidgetProvider implements OtpProvider {
  readonly family = 'msg91_widget' as const;

  async send(identifier: string) {
    const requestRef = await requestMsg91('sendOtp', { widgetId: env.MSG91_WIDGET_ID!, identifier });
    return { requestRef };
  }

  async retry(requestRef: string) {
    await requestMsg91('retryOtp', { widgetId: env.MSG91_WIDGET_ID!, reqId: requestRef, retryChannel: '11' });
  }

  async verify(requestRef: string, code: string) {
    const accessToken = await requestMsg91('verifyOtp', { widgetId: env.MSG91_WIDGET_ID!, reqId: requestRef, otp: code });
    const verifiedIdentifier = await requestMsg91('verifyAccessToken', { 'access-token': accessToken });
    return { verifiedIdentifier };
  }
}

export class FakeOtpProvider implements OtpProvider {
  readonly family = 'fake' as const;
  private readonly proofs = new Map<string, { identifier: string; used: boolean }>();

  async send(identifier: string) {
    const requestRef = crypto.randomUUID();
    this.proofs.set(requestRef, { identifier, used: false });
    return { requestRef };
  }

  async retry(requestRef: string) {
    if (!this.proofs.has(requestRef)) throw new OtpProviderError('expired', 'Fake OTP request expired.');
  }

  async verify(requestRef: string, code: string) {
    const proof = this.proofs.get(requestRef);
    if (!proof) throw new OtpProviderError('expired', 'Fake OTP request expired.');
    if (proof.used) throw new OtpProviderError('already_used', 'Fake OTP proof already used.');
    if (code !== env.OTP_FAKE_CODE) throw new OtpProviderError('incorrect_code', 'Incorrect OTP.');
    proof.used = true;
    return { verifiedIdentifier: proof.identifier };
  }
}

export const createOtpProvider = (): OtpProvider => env.OTP_PROVIDER === 'msg91'
  ? new Msg91WidgetProvider()
  : new FakeOtpProvider();

export const otpProvider: OtpProvider = createOtpProvider();
