import assert from 'node:assert/strict';
import test from 'node:test';
import { indianAmountInWords, renderInvoicePdf, type InvoiceRenderData } from './invoice.renderer.js';

const sampleMerchant = {
  name: 'Prem Electronics',
  address: '7, SHIVAKRUTI APPARTMENT, SHIVAJI ROAD, DANDIA BAZAR, VADODARA-390001.',
  phone: '9712000609',
  gstin: '24AAFPI9545M1ZB',
  stateName: 'Gujarat',
  stateCode: '24',
  email: 'premelectronics@ymail.com',
  bankName: 'HDFC BANK',
  bankAccountNo: '04292000005162',
  bankBranchIfsc: 'PANCHMUKHI VADODARA & HDFC0000429',
  declaration: 'Terms & Conditions apply.',
  signatureLabel: 'Authorised Signatory',
  documentTitle: 'TAX INVOICE',
};

const createInvoiceData = (count: number, isInterstate = false): InvoiceRenderData => ({
  merchant: sampleMerchant,
  order: {
    invoiceNumber: 'INV-TEST-001',
    orderNumber: 'ORD-1001',
    createdAt: new Date('2026-10-05T00:00:00Z').toISOString(),
    invoiceIssuedAt: new Date('2026-10-05T00:00:00Z').toISOString(),
    paymentMethod: 'Online',
    shippingAddress: {
      fullName: 'Customer Name',
      street: '123 Market Street',
      city: isInterstate ? 'Mumbai' : 'Vadodara',
      state: isInterstate ? 'Maharashtra' : 'Gujarat',
      pincode: isInterstate ? '400001' : '390001',
    },
    billingAddress: {
      fullName: 'Customer Name',
      street: '123 Market Street',
      city: isInterstate ? 'Mumbai' : 'Vadodara',
      state: isInterstate ? 'Maharashtra' : 'Gujarat',
      pincode: isInterstate ? '400001' : '390001',
    },
    buyerBusinessSnapshot: {
      legalName: 'Test Buyer Ltd',
      gstin: isInterstate ? '27AABCU9603R1ZM' : '24AABCU9603R1ZM',
    },
    taxSnapshot: {
      placeOfSupplyState: isInterstate ? 'Maharashtra' : 'Gujarat',
      taxableMinor: 100000 * count,
      cgstMinor: isInterstate ? 0 : 9000 * count,
      sgstMinor: isInterstate ? 0 : 9000 * count,
      igstMinor: isInterstate ? 18000 * count : 0,
      totalTaxMinor: 18000 * count,
    },
    amountMinor: 118000 * count,
    total: 1180 * count,
    tax: 180 * count,
  },
  items: Array.from({ length: count }, (_, index) => ({
    productTitle: `Panasonic Camcorder Model ${index + 1}`,
    hsnCodeSnapshot: '85258900',
    skuSnapshot: `SKU-${index + 1}`,
    quantity: 1,
    priceAtPurchase: 1180,
    unitPriceMinor: 100000,
    taxableMinor: 100000,
    gstRateBps: 1800,
    cgstMinor: isInterstate ? 0 : 9000,
    sgstMinor: isInterstate ? 0 : 9000,
    igstMinor: isInterstate ? 18000 : 0,
    lineTotalMinor: 118000,
  })),
});

test('Indian currency amount words are deterministic without paise', () => {
  assert.equal(
    indianAmountInWords(1234567800),
    'INR One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only'
  );
});

test('Indian currency amount words include paise when present', () => {
  assert.equal(
    indianAmountInWords(12345678),
    'INR One Lakh Twenty Three Thousand Four Hundred Fifty Six and Seventy Eight paise Only'
  );
});

test('invoice renderer creates a valid PDF with %PDF magic header', async () => {
  const result = await renderInvoicePdf(createInvoiceData(2));
  assert.equal(result.buffer.subarray(0, 4).toString(), '%PDF');
  assert.ok(result.buffer.length > 2_000);
  assert.equal(result.pageCount, 1);
});

test('invoice renderer handles interstate orders with IGST', async () => {
  const result = await renderInvoicePdf(createInvoiceData(2, true));
  assert.equal(result.buffer.subarray(0, 4).toString(), '%PDF');
  assert.ok(result.buffer.length > 2_000);
  assert.equal(result.pageCount, 1);
});
