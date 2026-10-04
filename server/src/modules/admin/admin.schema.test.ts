import assert from 'node:assert/strict';
import test from 'node:test';
import { customerListQuerySchema, transactionListQuerySchema } from './admin.schema.js';

test('admin list schemas reject malformed paging, repeated values, and untrusted sorts', () => {
  assert.equal(customerListQuerySchema.safeParse({ page: '-1' }).success, false);
  assert.equal(customerListQuerySchema.safeParse({ page: '1.5' }).success, false);
  assert.equal(customerListQuerySchema.safeParse({ limit: '101' }).success, false);
  assert.equal(customerListQuerySchema.safeParse({ page: ['1', '2'] }).success, false);
  assert.equal(transactionListQuerySchema.safeParse({ sortBy: 'amountMinor desc; drop table users' }).success, false);
  const valid = customerListQuerySchema.parse({ page: '2', limit: '20', state: 'blocked' });
  assert.deepEqual({ page: valid.page, limit: valid.limit, state: valid.state }, { page: 2, limit: 20, state: 'blocked' });
});
