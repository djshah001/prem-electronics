import assert from 'node:assert/strict';
import test from 'node:test';
import { env } from '../../config/env.js';
import { normalizeAuthPhone, toMsg91Identifier } from './phone.js';
import { FakeOtpProvider, OtpProviderError } from './otpProvider.js';

test('Indian auth phone normalization collapses equivalent inputs', () => {
  assert.equal(normalizeAuthPhone('98765 43210'), '+919876543210');
  assert.equal(normalizeAuthPhone('+91 98765-43210'), '+919876543210');
  assert.equal(toMsg91Identifier('+919876543210'), '919876543210');
});

test('unsupported countries and malformed phones are rejected', () => {
  assert.throws(() => normalizeAuthPhone('+14155552671'), /not supported/i);
  assert.throws(() => normalizeAuthPhone('1234'), /valid mobile/i);
});

test('fake provider is deterministic, one-time, and rejects wrong codes', async () => {
  const provider = new FakeOtpProvider();
  const { requestRef } = await provider.send('919876543210');
  await assert.rejects(() => provider.verify(requestRef, '000000'), (error) => error instanceof OtpProviderError && error.code === 'incorrect_code');
  assert.deepEqual(await provider.verify(requestRef, env.OTP_FAKE_CODE), { verifiedIdentifier: '919876543210' });
  await assert.rejects(() => provider.verify(requestRef, env.OTP_FAKE_CODE), (error) => error instanceof OtpProviderError && error.code === 'already_used');
});
