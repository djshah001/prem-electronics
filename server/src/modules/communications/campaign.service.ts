import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  campaignRecipients, campaigns, contentAuditEvents, emailDeliveryJobs, emailTemplateVersions, emailTemplates,
  marketingPreferences, marketingSuppressions, users,
} from '../../infrastructure/database/schema/index.js';
import { env } from '../../config/env.js';
import { AppError, NotFoundError } from '../../core/errors/appError.js';
import { emailMasterService } from './email.service.js';

const normalize = (email: string) => email.trim().toLowerCase();
export const isEligibleMarketingRecipient = (input: { optedIn?: boolean | null; suppressed?: boolean | null }) => input.optedIn === true && input.suppressed !== true;
export const dedupeMarketingAudience = <T extends { email: string }>(entries: T[]): T[] => {
  const seen = new Set<string>();
  return entries.filter((entry) => { const email = normalize(entry.email); if (seen.has(email)) return false; seen.add(email); entry.email = email; return true; });
};
const mask = (email: string) => { const [local, domain] = email.split('@'); return `${local.slice(0, 2)}***@${domain}`; };
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = (body: string) => createHmac('sha256', env.JWT_SECRET).update(body).digest('base64url');
export const createUnsubscribeToken = (recipientId: string, email: string) => { const body = encode({ recipientId, email: normalize(email), exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 }); return `${body}.${sign(body)}`; };
const parseUnsubscribeToken = (token: string) => {
  const [body, signature] = token.split('.');
  if (!body || !signature) throw new AppError('Invalid unsubscribe link.', 400);
  const expected = Buffer.from(sign(body)); const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new AppError('Invalid unsubscribe link.', 400);
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as { recipientId: string; email: string; exp: number };
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new AppError('This unsubscribe link has expired.', 400);
  return payload;
};

const audit = (entityId: string, action: string, actorId: string, metadata: Record<string, unknown> = {}) =>
  db.insert(contentAuditEvents).values({ entityType: 'campaign', entityId, action, actorId, metadata });

async function eligibleAudience() {
  const entries = await db.select({ userId: marketingPreferences.userId, email: marketingPreferences.email, name: users.name })
    .from(marketingPreferences).leftJoin(users, eq(users.id, marketingPreferences.userId)).leftJoin(marketingSuppressions, eq(marketingSuppressions.email, marketingPreferences.email))
    .where(and(eq(marketingPreferences.optedIn, true), isNull(marketingSuppressions.id))).orderBy(asc(marketingPreferences.email));
  return dedupeMarketingAudience(entries);
}

export const campaignService = {
  async audiencePreview() {
    const audience = await eligibleAudience();
    return { eligible: audience.length, samples: audience.slice(0, 5).map((entry) => mask(entry.email)), rule: 'Explicit opt-in and not suppressed; legacy accounts without consent are excluded.' };
  },

  async list() {
    return db.select({ campaign: campaigns, templateName: emailTemplates.name, templateVersion: emailTemplateVersions.version })
      .from(campaigns).innerJoin(emailTemplateVersions, eq(emailTemplateVersions.id, campaigns.templateVersionId)).innerJoin(emailTemplates, eq(emailTemplates.id, emailTemplateVersions.templateId)).orderBy(desc(campaigns.createdAt));
  },

  async detail(id: string) {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!campaign) throw new NotFoundError('Campaign not found.');
    const statusCounts = await db.select({ status: campaignRecipients.status, count: sql<number>`count(*)::int` }).from(campaignRecipients).where(eq(campaignRecipients.campaignId, id)).groupBy(campaignRecipients.status);
    return { ...campaign, counts: Object.fromEntries(statusCounts.map((entry) => [entry.status, Number(entry.count)])), deliveryMeaning: 'smtp_accepted means the configured SMTP server accepted the message; it does not prove inbox delivery.' };
  },

  async create(name: string, templateVersionId: string, actorId: string) {
    const [version] = await db.select({ id: emailTemplateVersions.id, category: emailTemplates.category }).from(emailTemplateVersions).innerJoin(emailTemplates, eq(emailTemplates.id, emailTemplateVersions.templateId)).where(eq(emailTemplateVersions.id, templateVersionId)).limit(1);
    if (!version || version.category !== 'marketing') throw new AppError('Campaigns require a published marketing template version.', 400);
    const [created] = await db.insert(campaigns).values({ name, templateVersionId, createdBy: actorId, updatedBy: actorId }).returning();
    await audit(created.id, 'created', actorId); return created;
  },

  async snapshot(id: string, actorId: string) {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!campaign || campaign.status !== 'draft') throw new AppError('Only a draft campaign can snapshot its audience.', 409);
    const audience = await eligibleAudience();
    await db.transaction(async (tx) => {
      await tx.delete(campaignRecipients).where(and(eq(campaignRecipients.campaignId, id), inArray(campaignRecipients.status, ['pending', 'suppressed'])));
      if (audience.length) await tx.insert(campaignRecipients).values(audience.map((entry) => ({ campaignId: id, userId: entry.userId, email: normalize(entry.email), variables: { customerName: entry.name ?? 'Customer' } }))).onConflictDoNothing();
      await tx.update(campaigns).set({ recipientSnapshotAt: new Date(), updatedBy: actorId, updatedAt: new Date() }).where(eq(campaigns.id, id));
      await tx.insert(contentAuditEvents).values({ entityType: 'campaign', entityId: id, action: 'audience_snapshotted', actorId, metadata: { recipients: audience.length } });
    });
    return this.detail(id);
  },

  async schedule(id: string, scheduledAt: Date, actorId: string) {
    if (scheduledAt <= new Date()) throw new AppError('Scheduled time must be in the future.', 400);
    const current = await this.detail(id);
    if (!current.recipientSnapshotAt) await this.snapshot(id, actorId);
    const [updated] = await db.update(campaigns).set({ status: 'scheduled', scheduledAt, updatedBy: actorId, updatedAt: new Date() }).where(and(eq(campaigns.id, id), inArray(campaigns.status, ['draft', 'paused']))).returning();
    if (!updated) throw new AppError('Campaign cannot be scheduled from its current state.', 409);
    await audit(id, 'scheduled', actorId, { scheduledAt: scheduledAt.toISOString(), timezone: 'UTC' }); return updated;
  },

  async start(id: string, actorId?: string) {
    let detail = await this.detail(id);
    if (!detail.recipientSnapshotAt) {
      if (!actorId) throw new AppError('Scheduled campaign has no audience snapshot.', 409);
      await this.snapshot(id, actorId); detail = await this.detail(id);
    }
    if (!['draft', 'scheduled', 'paused'].includes(detail.status)) throw new AppError('Campaign cannot start from its current state.', 409);
    await db.update(campaigns).set({ status: 'running', startedAt: detail.startedAt ?? new Date(), updatedBy: actorId, updatedAt: new Date() }).where(eq(campaigns.id, id));
    const recipients = await db.select({ recipient: campaignRecipients, suppressionId: marketingSuppressions.id, optedIn: marketingPreferences.optedIn })
      .from(campaignRecipients).leftJoin(marketingSuppressions, eq(marketingSuppressions.email, campaignRecipients.email)).leftJoin(marketingPreferences, eq(marketingPreferences.email, campaignRecipients.email))
      .where(and(eq(campaignRecipients.campaignId, id), eq(campaignRecipients.status, 'pending')));
    for (const entry of recipients) {
      if (entry.suppressionId || entry.optedIn !== true) {
        await db.update(campaignRecipients).set({ status: 'suppressed', suppressionReason: entry.suppressionId ? 'suppression_list' : 'consent_withdrawn', updatedAt: new Date() }).where(eq(campaignRecipients.id, entry.recipient.id));
        continue;
      }
      const token = createUnsubscribeToken(entry.recipient.id, entry.recipient.email);
      const variables = { ...entry.recipient.variables, campaignSubject: detail.name, campaignMessage: detail.name, unsubscribeUrl: `${env.CLIENT_URL}/unsubscribe?token=${encodeURIComponent(token)}` };
      const job = await emailMasterService.enqueue('promotion', entry.recipient.email, variables, `campaign:${id}:recipient:${entry.recipient.id}`, { campaignRecipientId: entry.recipient.id, templateVersionId: detail.templateVersionId, priority: 100 });
      await db.update(campaignRecipients).set({ status: job.status === 'render_failed' ? 'failed' : 'queued', deliveryJobId: job.id, variables, suppressionReason: job.status === 'render_failed' ? 'template_render_failed' : null, updatedAt: new Date() }).where(eq(campaignRecipients.id, entry.recipient.id));
    }
    if (actorId) await audit(id, 'started', actorId, { deliveryEnabled: env.CAMPAIGN_DELIVERY_ENABLED });
    return this.detail(id);
  },

  async pause(id: string, actorId: string) {
    const [updated] = await db.update(campaigns).set({ status: 'paused', updatedBy: actorId, updatedAt: new Date() }).where(and(eq(campaigns.id, id), eq(campaigns.status, 'running'))).returning();
    if (!updated) throw new AppError('Only a running campaign can be paused.', 409);
    await audit(id, 'paused', actorId); return updated;
  },

  async cancel(id: string, actorId: string) {
    await db.transaction(async (tx) => {
      await tx.update(campaigns).set({ status: 'cancelled', updatedBy: actorId, updatedAt: new Date() }).where(and(eq(campaigns.id, id), inArray(campaigns.status, ['draft', 'scheduled', 'running', 'paused'])));
      await tx.update(campaignRecipients).set({ status: 'cancelled', updatedAt: new Date() }).where(and(eq(campaignRecipients.campaignId, id), inArray(campaignRecipients.status, ['pending', 'queued'])));
      const jobIds = await tx.select({ id: campaignRecipients.deliveryJobId }).from(campaignRecipients).where(eq(campaignRecipients.campaignId, id));
      const ids = jobIds.flatMap((entry) => entry.id ? [entry.id] : []);
      if (ids.length) await tx.update(emailDeliveryJobs).set({ status: 'cancelled', updatedAt: new Date() }).where(and(inArray(emailDeliveryJobs.id, ids), inArray(emailDeliveryJobs.status, ['queued', 'failed', 'unknown'])));
      await tx.insert(contentAuditEvents).values({ entityType: 'campaign', entityId: id, action: 'cancelled', actorId });
    });
    return this.detail(id);
  },

  async processScheduled() {
    const due = await db.select({ id: campaigns.id }).from(campaigns).where(and(eq(campaigns.status, 'scheduled'), lte(campaigns.scheduledAt, new Date()))).limit(10);
    for (const campaign of due) await this.start(campaign.id);
    return due.length;
  },

  async test(id: string, adminEmail: string) {
    const campaign = await this.detail(id);
    const variables = { customerName: 'Admin Preview', campaignSubject: `[TEST] ${campaign.name}`, campaignMessage: 'This is a campaign test. No audience recipient was contacted.', unsubscribeUrl: `${env.CLIENT_URL}/unsubscribe?token=preview-token` };
    const job = await emailMasterService.enqueue('promotion', adminEmail, variables, `campaign-test:${id}:${Date.now()}`, { templateVersionId: campaign.templateVersionId, priority: 1 });
    await emailMasterService.processJob(job.id);
    return (await db.select().from(emailDeliveryJobs).where(eq(emailDeliveryJobs.id, job.id)).limit(1))[0];
  },

  async unsubscribeConfirmation(token: string) {
    const payload = parseUnsubscribeToken(token);
    const [recipient] = await db.select({ id: campaignRecipients.id, campaignName: campaigns.name }).from(campaignRecipients).innerJoin(campaigns, eq(campaigns.id, campaignRecipients.campaignId)).where(and(eq(campaignRecipients.id, payload.recipientId), eq(campaignRecipients.email, payload.email))).limit(1);
    if (!recipient) throw new AppError('Unsubscribe link is no longer valid.', 400);
    const [suppression] = await db.select().from(marketingSuppressions).where(eq(marketingSuppressions.email, payload.email)).limit(1);
    return { email: mask(payload.email), campaignName: recipient.campaignName, alreadyUnsubscribed: Boolean(suppression) };
  },

  async unsubscribe(token: string) {
    const payload = parseUnsubscribeToken(token);
    await db.transaction(async (tx) => {
      await tx.insert(marketingSuppressions).values({ email: payload.email, reason: 'unsubscribe', source: 'campaign_link' }).onConflictDoNothing({ target: marketingSuppressions.email });
      await tx.update(marketingPreferences).set({ optedIn: false, withdrawnAt: new Date(), updatedAt: new Date() }).where(eq(marketingPreferences.email, payload.email));
    });
    return { unsubscribed: true, email: mask(payload.email) };
  },

  async getPreference(userId: string, email: string) {
    const [preference] = await db.select().from(marketingPreferences).where(eq(marketingPreferences.email, normalize(email))).limit(1);
    return preference ?? { userId, email: normalize(email), optedIn: false, provenance: 'no_record' };
  },

  async setPreference(userId: string, email: string, optedIn: boolean) {
    const normalized = normalize(email);
    // An authenticated, explicit opt-in is the only action that clears prior voluntary unsubscribe suppressions.
    if (optedIn) await db.delete(marketingSuppressions).where(eq(marketingSuppressions.email, normalized));
    const [preference] = await db.insert(marketingPreferences).values({ userId, email: normalized, optedIn, provenance: 'account_preference_center', consentedAt: optedIn ? new Date() : null, withdrawnAt: optedIn ? null : new Date() })
      .onConflictDoUpdate({ target: marketingPreferences.email, set: { userId, optedIn, provenance: 'account_preference_center', consentedAt: optedIn ? new Date() : null, withdrawnAt: optedIn ? null : new Date(), updatedAt: new Date() } }).returning();
    if (!optedIn) await db.insert(marketingSuppressions).values({ email: normalized, reason: 'preference_withdrawn', source: 'preference_center' }).onConflictDoNothing({ target: marketingSuppressions.email });
    return preference;
  },
};
