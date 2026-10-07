import assert from 'node:assert/strict';
import test from 'node:test';
import { dedupeMarketingAudience, isEligibleMarketingRecipient } from './campaign.service.js';

test('campaign eligibility requires explicit opt-in and no suppression', () => {
  assert.equal(isEligibleMarketingRecipient({}), false);
  assert.equal(isEligibleMarketingRecipient({ optedIn: false }), false);
  assert.equal(isEligibleMarketingRecipient({ optedIn: true, suppressed: true }), false);
  assert.equal(isEligibleMarketingRecipient({ optedIn: true, suppressed: false }), true);
});

test('campaign audience deduplicates normalized email addresses', () => {
  const result = dedupeMarketingAudience([{ email: ' Asha@Example.test ', id: 1 }, { email: 'asha@example.test', id: 2 }, { email: 'ravi@example.test', id: 3 }]);
  assert.deepEqual(result.map((entry) => entry.id), [1, 3]);
  assert.equal(result[0].email, 'asha@example.test');
});

