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
  const result = await provider.sendWhatsapp({
    recipient: '+919876543210',
    templateName: 'order_confirmed_pdf',
    namespace: 'dc61b116_c9a1_4df9_bdc1_5c2d888bfddb',
    header: {
      type: 'document',
      filename: 'Invoice_1405.pdf',
      value: 'https://example.com/invoice.pdf',
    },
    bodyValues: ['Rahul Sharma', 'PE-2026-000001', '₹3,99,000'],
    button: {
      subtype: 'url',
      type: 'text',
      value: 'order-123',
    },
  });
  assert.match(result.providerMessageId, /^fake-whatsapp-/);
});
