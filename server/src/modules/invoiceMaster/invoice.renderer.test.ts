import assert from 'node:assert/strict';
import test from 'node:test';
import { indianAmountInWords, renderInvoicePdf } from './invoice.renderer.js';
import type { InvoiceTemplateConfig } from '../../infrastructure/database/schema/contentMasters.js';

const config: InvoiceTemplateConfig = {
  page: { size: 'A4', marginMm: 10, repeatTableHeader: true, showPageNumbers: true }, labels: {},
  sections: ['seller','buyer','metadata','items','taxSummary','amountWords','bank','terms','signature'].map((key, order) => ({ key, visible: true, order })),
  merchant: { name: 'Prem Electronics', address: 'Vadodara, Gujarat', signatureLabel: 'Authorised Signatory' },
};
const invoiceData = (count: number) => ({
  merchant: { name: 'Prem Electronics' },
  order: { invoiceNumber: 'INV-TEST', createdAt: new Date('2026-10-05T00:00:00Z'), paymentMethod: 'online', shippingAddress: { fullName: 'Customer', street: 'A long address', city: 'Vadodara', state: 'Gujarat', pincode: '390001', country: 'India' }, total: 59000, amountMinor: 5900000, tax: 9000, taxSnapshot: { placeOfSupplyState: 'Gujarat', taxableMinor: 5000000, cgstMinor: 450000, sgstMinor: 450000, igstMinor: 0, totalTaxMinor: 900000 } },
  items: Array.from({ length: count }, (_, index) => ({ productTitle: `Electronic product ${index + 1} with long descriptive title`, hsnCodeSnapshot: '8517', skuSnapshot: `SKU-${index}`, quantity: 1, priceAtPurchase: 590, unitPriceMinor: 50000, taxableMinor: 50000, gstRateBps: 1800, cgstMinor: 4500, sgstMinor: 4500, igstMinor: 0, lineTotalMinor: 59000 })),
});

test('Indian currency amount words are deterministic', () => {
  assert.equal(indianAmountInWords(12345678), 'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Rupees Only');
});

test('invoice renderer creates a multi-page A4 PDF for many items', async () => {
  const result = await renderInvoicePdf(config, invoiceData(75));
  assert.equal(result.buffer.subarray(0, 4).toString(), '%PDF');
  assert.ok(result.buffer.length > 3_000);
  assert.ok(result.pageCount >= 2);
});

test('reference-sized invoice remains on one A4 page', async () => {
  const result = await renderInvoicePdf(config, invoiceData(4));
  assert.equal(result.pageCount, 1);
});
