import { env } from '../../config/env.js';
import { AppError, NotFoundError } from '../../core/errors/appError.js';
import type { BusinessAddress } from '../database/schema/businesses.js';

export type GstRegistrationStatus = 'active' | 'inactive' | 'cancelled' | 'suspended' | 'unknown';

export type GstTaxpayer = {
  gstin: string;
  legalName: string;
  tradeName?: string;
  taxpayerType?: string;
  registrationStatus: GstRegistrationStatus;
  stateCode: string;
  stateName: string;
  principalAddress?: BusinessAddress;
  additionalAddresses: BusinessAddress[];
  raw: Record<string, unknown>;
};

export interface GstProvider {
  readonly name: string;
  lookup(gstin: string): Promise<GstTaxpayer>;
}

const normalizeStatus = (value: unknown): GstRegistrationStatus => {
  const status = String(value ?? '').trim().toLowerCase();
  if (status === 'active') return 'active';
  if (status.includes('cancel')) return 'cancelled';
  if (status.includes('suspend')) return 'suspended';
  if (status.includes('inactive')) return 'inactive';
  return 'unknown';
};

const toAddress = (input: any, fallbackStateCode: string): BusinessAddress | undefined => {
  const address = input?.addr ?? input;
  if (!address || typeof address !== 'object') return undefined;
  const state = String(address.stcd ?? address.state ?? '').trim();
  if (!state) return undefined;
  return {
    building: [address.flno, address.bno, address.bnm].filter(Boolean).join(', ') || undefined,
    street: String(address.st ?? '').trim() || undefined,
    locality: String(address.loc ?? '').trim() || undefined,
    city: String(address.city ?? '').trim() || undefined,
    district: String(address.dst ?? '').trim() || undefined,
    state,
    stateCode: String(address.stateCode ?? fallbackStateCode),
    pincode: address.pncd ? String(address.pncd) : undefined,
    country: 'India',
    source: 'provider',
  };
};

const normalizeClearTaxPayload = (payload: any, requestedGstin: string): GstTaxpayer => {
  const body = payload?.data ?? payload;
  if (!body || body?.error || body?.status === 404) throw new NotFoundError('GSTIN was not found by the configured provider.');
  const legalName = String(body.lgnm ?? body.legalName ?? '').trim();
  if (!legalName) throw new AppError('GST provider returned an incomplete taxpayer record.', 502);
  const gstin = String(body.gstin ?? requestedGstin).toUpperCase();
  const stateCode = gstin.slice(0, 2);
  const principalAddress = toAddress(body.pradr, stateCode);
  const additionalAddresses = Array.isArray(body.adadr)
    ? body.adadr.map((entry: unknown) => toAddress(entry, stateCode)).filter(Boolean) as BusinessAddress[]
    : [];
  return {
    gstin,
    legalName,
    tradeName: String(body.tradeNam ?? body.tradeName ?? '').trim() || undefined,
    taxpayerType: String(body.dty ?? body.taxpayerType ?? '').trim() || undefined,
    registrationStatus: normalizeStatus(body.sts ?? body.status),
    stateCode,
    stateName: principalAddress?.state ?? String(body.stateName ?? '').trim(),
    principalAddress,
    additionalAddresses,
    raw: body as Record<string, unknown>,
  };
};

class ClearTaxGstProvider implements GstProvider {
  readonly name = 'cleartax';

  async lookup(gstin: string): Promise<GstTaxpayer> {
    if (!env.GST_PROVIDER_BASE_URL || !env.GST_PROVIDER_AUTH_TOKEN || !env.GST_PROVIDER_TAXABLE_ENTITY_ID) {
      throw new AppError('GST lookup provider is not fully configured.', 503);
    }
    const base = env.GST_PROVIDER_BASE_URL.replace(/\/$/, '');
    const url = `${base}/gst/api/v0.2/taxable_entities/${encodeURIComponent(env.GST_PROVIDER_TAXABLE_ENTITY_ID)}/gstin_verification?gstin=${encodeURIComponent(gstin)}`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'X-Cleartax-Auth-Token': env.GST_PROVIDER_AUTH_TOKEN, accept: 'application/json' },
        signal: AbortSignal.timeout(env.GST_LOOKUP_TIMEOUT_MS),
      });
    } catch (error) {
      throw new AppError(error instanceof DOMException && error.name === 'TimeoutError'
        ? 'GST lookup provider timed out. Please retry.'
        : 'GST lookup provider is unavailable. Please retry.', 503);
    }
    if (response.status === 404) throw new NotFoundError('GSTIN was not found by the configured provider.');
    if (!response.ok) throw new AppError(`GST lookup provider returned HTTP ${response.status}.`, 503);
    return normalizeClearTaxPayload(await response.json(), gstin);
  }
}

const fixtureRecords: Record<string, Omit<GstTaxpayer, 'raw'>> = {
  '27AAPFU0939F1ZV': {
    gstin: '27AAPFU0939F1ZV',
    legalName: 'DEVELOPMENT FIXTURE ENTERPRISES',
    tradeName: 'Fixture Electronics',
    taxpayerType: 'Regular',
    registrationStatus: 'active',
    stateCode: '27',
    stateName: 'Maharashtra',
    principalAddress: { street: 'Fixture Road', city: 'Pune', district: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411001', country: 'India', source: 'provider' },
    additionalAddresses: [],
  },
};

class FixtureGstProvider implements GstProvider {
  readonly name = 'fixture';
  async lookup(gstin: string): Promise<GstTaxpayer> {
    if (env.NODE_ENV === 'production' || !env.ALLOW_GST_FIXTURES) throw new AppError('GST fixtures are disabled.', 503);
    const record = fixtureRecords[gstin];
    if (!record) throw new NotFoundError('GSTIN was not found in the development fixture set.');
    return { ...record, raw: { fixture: true } };
  }
}

class UnconfiguredGstProvider implements GstProvider {
  readonly name = 'unconfigured';
  async lookup(): Promise<GstTaxpayer> {
    throw new AppError('GST lookup is not configured. Add an approved GSP provider before using company verification.', 503);
  }
}

export const getGstProvider = (): GstProvider => {
  if (env.GST_PROVIDER === 'cleartax') return new ClearTaxGstProvider();
  if (env.GST_PROVIDER === 'fixture') return new FixtureGstProvider();
  return new UnconfiguredGstProvider();
};
