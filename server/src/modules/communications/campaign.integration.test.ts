import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import { campaignRecipients, campaigns, marketingPreferences, marketingSuppressions } from '../../infrastructure/database/schema/index.js';
import { campaignService, createUnsubscribeToken } from './campaign.service.js';
import { emailMasterService } from './email.service.js';

test('unsubscribe confirmation has no side effect and repeated POST is idempotent', async () => {
  const email = `p3-unsubscribe-${randomUUID()}@example.test`;
  const { version } = await emailMasterService.ensureSystemTemplate('promotion');
  const [campaign] = await db.insert(campaigns).values({ name: `P3 unsubscribe integration ${randomUUID()}`, templateVersionId: version.id }).returning();
  const [preference] = await db.insert(marketingPreferences).values({ email, optedIn: true, provenance: 'integration_test', consentedAt: new Date() }).returning();
  const [recipient] = await db.insert(campaignRecipients).values({ campaignId: campaign.id, email, variables: { customerName: 'Test' } }).returning();
  const token = createUnsubscribeToken(recipient.id, email);
  try {
    const confirmation = await campaignService.unsubscribeConfirmation(token);
    assert.equal(confirmation.alreadyUnsubscribed, false);
    const [unchanged] = await db.select().from(marketingPreferences).where(eq(marketingPreferences.id, preference.id));
    assert.equal(unchanged.optedIn, true);

    assert.equal((await campaignService.unsubscribe(token)).unsubscribed, true);
    assert.equal((await campaignService.unsubscribe(token)).unsubscribed, true);
    const [withdrawn] = await db.select().from(marketingPreferences).where(eq(marketingPreferences.id, preference.id));
    const suppression = await db.select().from(marketingSuppressions).where(eq(marketingSuppressions.email, email));
    assert.equal(withdrawn.optedIn, false);
    assert.equal(suppression.length, 1);
  } finally {
    await db.delete(campaigns).where(eq(campaigns.id, campaign.id));
    await db.delete(marketingPreferences).where(eq(marketingPreferences.id, preference.id));
    await db.delete(marketingSuppressions).where(and(eq(marketingSuppressions.email, email), eq(marketingSuppressions.source, 'campaign_link')));
  }
});
