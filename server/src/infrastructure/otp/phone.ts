import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/appError.js';

const allowedCountries = new Set(env.AUTH_ALLOWED_COUNTRIES);

export const normalizeAuthPhone = (input: string): string => {
  const value = input.trim();
  const parsed = parsePhoneNumberFromString(value, 'IN');
  if (!parsed?.isValid()) {
    throw new AppError('Enter a valid mobile number.', 422, { code: 'invalid_phone' });
  }
  const country = parsed.country as CountryCode | undefined;
  if (!country || !allowedCountries.has(country)) {
    throw new AppError('This mobile number country is not supported.', 422, { code: 'unsupported_country' });
  }
  if (country === 'IN' && parsed.getType() && parsed.getType() !== 'MOBILE') {
    throw new AppError('Enter a valid Indian mobile number.', 422, { code: 'invalid_phone' });
  }
  return parsed.number;
};

export const toMsg91Identifier = (canonicalPhone: string): string => canonicalPhone.replace(/^\+/, '');

export const maskPhone = (canonicalPhone: string): string => {
  const digits = canonicalPhone.replace(/\D/g, '');
  const suffix = digits.slice(-4);
  const country = canonicalPhone.startsWith('+91') ? '+91' : canonicalPhone.slice(0, Math.max(1, canonicalPhone.length - 10));
  return `${country} ••••••${suffix}`;
};
