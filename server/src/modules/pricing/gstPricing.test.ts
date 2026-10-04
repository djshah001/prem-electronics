import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGstPricing } from './gstPricing.js';

const lines = [{ id: 'line-1', quantity: 1, unitPriceMinor: 10_000, gstRateBps: 1800 }];

test('intra-state exclusive pricing splits tax into CGST and SGST', () => {
  const result = calculateGstPricing({ lines, discountMinor: 0, shippingMinor: 9900, taxMode: 'exclusive', supplierStateCode: '27', placeOfSupplyStateCode: '27' });
  assert.equal(result.taxableMinor, 10_000);
  assert.equal(result.cgstMinor, 900);
  assert.equal(result.sgstMinor, 900);
  assert.equal(result.igstMinor, 0);
  assert.equal(result.totalMinor, 21_700);
});

test('inter-state exclusive pricing assigns the same tax to IGST', () => {
  const result = calculateGstPricing({ lines, discountMinor: 0, shippingMinor: 0, taxMode: 'exclusive', supplierStateCode: '27', placeOfSupplyStateCode: '29' });
  assert.equal(result.cgstMinor, 0);
  assert.equal(result.sgstMinor, 0);
  assert.equal(result.igstMinor, 1800);
  assert.equal(result.totalMinor, 11_800);
});

test('discount allocation preserves the exact discount and inclusive total', () => {
  const result = calculateGstPricing({
    lines: [
      { id: 'a', quantity: 1, unitPriceMinor: 101, gstRateBps: 1800 },
      { id: 'b', quantity: 1, unitPriceMinor: 202, gstRateBps: 1800 },
    ],
    discountMinor: 100, shippingMinor: 0, taxMode: 'inclusive', supplierStateCode: '27', placeOfSupplyStateCode: '27',
  });
  assert.equal(result.lines.reduce((sum, line) => sum + line.discountMinor, 0), 100);
  assert.equal(result.totalMinor, 203);
  assert.equal(result.cgstMinor + result.sgstMinor, result.taxMinor);
});
