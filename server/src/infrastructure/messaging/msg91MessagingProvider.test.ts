import assert from 'node:assert/strict';
import test from 'node:test';
import { FakeMessagingProvider } from './msg91MessagingProvider.js';

test('fake messaging provider acknowledges SMS without external delivery', async () => {
  const provider = new FakeMessagingProvider();
  const result = await provider.sendSms();
  assert.match(result.providerMessageId, /^fake-sms-/);
});

test('fake messaging provider acknowledges WhatsApp without external delivery', async () => {
  const provider = new FakeMessagingProvider();
  const result = await provider.sendWhatsapp();
  assert.match(result.providerMessageId, /^fake-whatsapp-/);
});
