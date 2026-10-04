import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGstinCheckDigit, isValidGstin, normalizeGstin } from './gstin.js';

test('normalizes and accepts a checksum-valid GSTIN', () => {
  assert.equal(normalizeGstin(' 27aapfu0939f1zv '), '27AAPFU0939F1ZV');
  assert.equal(calculateGstinCheckDigit('27AAPFU0939F1Z'), 'V');
  assert.equal(isValidGstin('27AAPFU0939F1ZV'), true);
});

test('rejects invalid format and checksum before any provider request', () => {
  assert.equal(isValidGstin('27AAPFU0939F1ZA'), false);
  assert.equal(isValidGstin('not-a-gstin'), false);
});
