import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  campaignRecipients,
  campaigns,
  contentAuditEvents,
  emailDeliveryJobs,
  emailTemplateVersions,
  emailTemplates,
  marketingPreferences,
  marketingSuppressions,
  messageDeliveryJobs,
  mobileMarketingPreferences,
  users,
  whatsappMarketingSuppressions,
} from '../../infrastructure/database/schema/index.js';
import { env } from '../../config/env.js';
import { AppError, NotFoundError } from '../../core/errors/appError.js';
import { emailMasterService } from './email.service.js';
import { messageService } from './message.service.js';

type CampaignChannel = 'email' | 'whatsapp';
type CreateCampaignInput =
  | { channel: 'email'; name: string; templateVersionId: string }
  | { channel: 'whatsapp'; name: string; templateName: string; templateLanguage: string; bodyVariables: string[] };

const normalize = (email: string) => email.trim().toLowerCase();
export const isEligibleMarketingRecipient = (input: { optedIn?: boolean | null; suppressed?: boolean | null }) => input.optedIn === true && input.suppressed !== true;
export const dedupeMarketingAudience = <T extends { email: string }>(entries: T[]): T[] => {
  const seen = new Set<string>();
  return entries.filter((entry) => { const email = normalize(entry.email); if (seen.has(email)) return false; seen.add(email); entry.email = email; return true; });
};
const dedupePhoneAudience = <T extends { phone: string }>(entries: T[]): T[] => {
  const seen = new Set<string>();
  return entries.filter((entry) => { if (seen.has(entry.phone)) return false; seen.add(entry.phone); return true; });
};
const maskEmail = (email: string) => { const [local, domain] = email.split('@'); return `${local.slice(0, 2)}***@${domain}`; };
const maskPhone = (phone: string) => `${phone.slice(0, 3)}••••••${phone.slice(-4)}`;
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

async function eligibleEmailAudience() {
  const entries = await db.select({ userId: marketingPreferences.userId, email: marketingPreferences.email, name: users.name })
    .from(marketingPreferences).leftJoin(users, eq(users.id, marketingPreferences.userId)).leftJoin(marketingSuppressions, eq(marketingSuppressions.email, marketingPreferences.email))
    .where(and(eq(marketingPreferences.optedIn, true), isNull(marketingSuppressions.id))).orderBy(asc(marketingPreferences.email));
  return dedupeMarketingAudience(entries);
}

async function eligibleWhatsappAudience() {
  const entries = await db.select({ userId: mobileMarketingPreferences.userId, phone: mobileMarketingPreferences.phone, name: users.name })
    .from(mobileMarketingPreferences).innerJoin(users, eq(users.id, mobileMarketingPreferences.userId)).leftJoin(whatsappMarketingSuppressions, eq(whatsappMarketingSuppressions.phone, mobileMarketingPreferences.phone))
    .where(and(eq(mobileMarketingPreferences.whatsappOptedIn, true), isNull(whatsappMarketingSuppressions.id))).orderBy(asc(mobileMarketingPreferences.phone));
  return dedupePhoneAudience(entries);
}

const resolveBodyValues = (values: string[], variables: Record<string, unknown>) => values.map((value) =>
  value.replace(/{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g, (_match, key: string) => String(variables[key] ?? '')),
);

async function completeIfSettled(id: string) {
  const [remaining] = await db.select({ count: sql<number>`count(*)::int` }).from(campaignRecipients)
    .where(and(eq(campaignRecipients.campaignId, id), inArray(campaignRecipients.status, ['pending', 'queued'])));
  if (Number(remaining?.count ?? 0) === 0) {
    await db.update(campaigns).set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() }).where(eq(campaigns.id, id));
  }
}

export const campaignService = {
  async audiencePreview(channel: CampaignChannel = 'email') {
    if (channel === 'whatsapp') {
      const audience = await eligibleWhatsappAudience();
      return { channel, eligible: audience.length, samples: audience.slice(0, 5).map((entry) => maskPhone(entry.phone)), rule: 'Explicit WhatsApp opt-in and not suppressed; consent is checked again immediately before submission.' };
    }
    const audience = await eligibleEmailAudience();
    return { channel, eligible: audience.length, samples: audience.slice(0, 5).map((entry) => maskEmail(entry.email)), rule: 'Explicit email opt-in and not suppressed; legacy accounts without consent are excluded.' };
  },

  async list() {
    const rows = await db.select({ campaign: campaigns, emailTemplateName: emailTemplates.name, templateVersion: emailTemplateVersions.version })
      .from(campaigns)
      .leftJoin(emailTemplateVersions, eq(emailTemplateVersions.id, campaigns.templateVersionId))
      .leftJoin(emailTemplates, eq(emailTemplates.id, emailTemplateVersions.templateId))
      .orderBy(desc(campaigns.createdAt));
    return rows.map((row) => ({
      campaign: row.campaign,
      templateName: row.campaign.channel === 'whatsapp' ? row.campaign.whatsappTemplateName : row.emailTemplateName,
      templateVersion: row.campaign.channel === 'whatsapp' ? null : row.templateVersion,
    }));
  },

  async detail(id: string) {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!campaign) throw new NotFoundError('Campaign not found.');
    const statusCounts = await db.select({ status: campaignRecipients.status, count: sql<number>`count(*)::int` }).from(campaignRecipients).where(eq(campaignRecipients.campaignId, id)).groupBy(campaignRecipients.status);
    return {
      ...campaign,
      counts: Object.fromEntries(statusCounts.map((entry) => [entry.status, Number(entry.count)])),
      deliveryMeaning: campaign.channel === 'email'
        ? 'smtp_accepted means the configured SMTP server accepted the message; it does not prove inbox delivery.'
        : 'provider_accepted means MSG91 accepted the template submission; final handset delivery requires provider delivery reports.',
    };
  },

  async create(input: CreateCampaignInput, actorId: string) {
    if (input.channel === 'email') {
      const [version] = await db.select({ id: emailTemplateVersions.id, category: emailTemplates.category }).from(emailTemplateVersions).innerJoin(emailTemplates, eq(emailTemplates.id, emailTemplateVersions.templateId)).where(eq(emailTemplateVersions.id, input.templateVersionId)).limit(1);
      if (!version || version.category !== 'marketing') throw new AppError('Email campaigns require a published marketing template version.', 400);
      const [created] = await db.insert(campaigns).values({ name: input.name, channel: 'email', templateVersionId: input.templateVersionId, createdBy: actorId, updatedBy: actorId }).returning();
      await audit(created.id, 'created', actorId, { channel: 'email' }); return created;
    }
    const [created] = await db.insert(campaigns).values({
      name: input.name, channel: 'whatsapp', templateVersionId: null,
      whatsappTemplateName: input.templateName, whatsappTemplateLanguage: input.templateLanguage,
      whatsappBodyVariables: input.bodyVariables, createdBy: actorId, updatedBy: actorId,
    }).returning();
    await audit(created.id, 'created', actorId, { channel: 'whatsapp', templateName: input.templateName }); return created;
  },

  async snapshot(id: string, actorId: string) {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!campaign || campaign.status !== 'draft') throw new AppError('Only a draft campaign can snapshot its audience.', 409);
    const audience = campaign.channel === 'whatsapp' ? await eligibleWhatsappAudience() : await eligibleEmailAudience();
    await db.transaction(async (tx) => {
      await tx.delete(campaignRecipients).where(and(eq(campaignRecipients.campaignId, id), inArray(campaignRecipients.status, ['pending', 'suppressed'])));
      if (audience.length) {
        if (campaign.channel === 'whatsapp') {
          await tx.insert(campaignRecipients).values((audience as Awaited<ReturnType<typeof eligibleWhatsappAudience>>).map((entry) => ({ campaignId: id, userId: entry.userId, phone: entry.phone, variables: { customerName: entry.name ?? 'Customer' } }))).onConflictDoNothing();
        } else {
          await tx.insert(campaignRecipients).values((audience as Awaited<ReturnType<typeof eligibleEmailAudience>>).map((entry) => ({ campaignId: id, userId: entry.userId, email: normalize(entry.email), variables: { customerName: entry.name ?? 'Customer' } }))).onConflictDoNothing();
        }
      }
      await tx.update(campaigns).set({ recipientSnapshotAt: new Date(), updatedBy: actorId, updatedAt: new Date() }).where(eq(campaigns.id, id));
      await tx.insert(contentAuditEvents).values({ entityType: 'campaign', entityId: id, action: 'audience_snapshotted', actorId, metadata: { channel: campaign.channel, recipients: audience.length } });
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

    if (detail.channel === 'whatsapp') {
      if (!detail.whatsappTemplateName) throw new AppError('WhatsApp template configuration is missing.', 409);
      const recipients = await db.select({ recipient: campaignRecipients, suppressionId: whatsappMarketingSuppressions.id, optedIn: mobileMarketingPreferences.whatsappOptedIn })
        .from(campaignRecipients).leftJoin(whatsappMarketingSuppressions, eq(whatsappMarketingSuppressions.phone, campaignRecipients.phone)).leftJoin(mobileMarketingPreferences, eq(mobileMarketingPreferences.phone, campaignRecipients.phone))
        .where(and(eq(campaignRecipients.campaignId, id), eq(campaignRecipients.status, 'pending')));
      for (const entry of recipients) {
        if (!entry.recipient.phone || entry.suppressionId || entry.optedIn !== true) {
          await db.update(campaignRecipients).set({ status: 'suppressed', suppressionReason: entry.suppressionId ? 'suppression_list' : 'consent_withdrawn', updatedAt: new Date() }).where(eq(campaignRecipients.id, entry.recipient.id));
          continue;
        }
        const variables = { ...entry.recipient.variables, campaignName: detail.name };
        const job = await messageService.enqueue({
          channel: 'whatsapp', purpose: 'marketing', eventKey: 'whatsapp_campaign', recipient: entry.recipient.phone,
          templateKey: detail.whatsappTemplateName, language: detail.whatsappTemplateLanguage ?? env.MSG91_WHATSAPP_LANGUAGE,
          variables: { bodyValues: resolveBodyValues(detail.whatsappBodyVariables, variables) },
          dedupeKey: `campaign:whatsapp:${id}:recipient:${entry.recipient.id}`, campaignRecipientId: entry.recipient.id,
        });
        await db.update(campaignRecipients).set({ status: 'queued', messageDeliveryJobId: job.id, variables, updatedAt: new Date() }).where(eq(campaignRecipients.id, entry.recipient.id));
      }
    } else {
      if (!detail.templateVersionId) throw new AppError('Email template configuration is missing.', 409);
      const recipients = await db.select({ recipient: campaignRecipients, suppressionId: marketingSuppressions.id, optedIn: marketingPreferences.optedIn })
        .from(campaignRecipients).leftJoin(marketingSuppressions, eq(marketingSuppressions.email, campaignRecipients.email)).leftJoin(marketingPreferences, eq(marketingPreferences.email, campaignRecipients.email))
        .where(and(eq(campaignRecipients.campaignId, id), eq(campaignRecipients.status, 'pending')));
      for (const entry of recipients) {
        if (!entry.recipient.email || entry.suppressionId || entry.optedIn !== true) {
          await db.update(campaignRecipients).set({ status: 'suppressed', suppressionReason: entry.suppressionId ? 'suppression_list' : 'consent_withdrawn', updatedAt: new Date() }).where(eq(campaignRecipients.id, entry.recipient.id));
          continue;
        }
        const token = createUnsubscribeToken(entry.recipient.id, entry.recipient.email);
        const variables = { ...entry.recipient.variables, campaignSubject: detail.name, campaignMessage: detail.name, unsubscribeUrl: `${env.CLIENT_URL}/unsubscribe?token=${encodeURIComponent(token)}` };
        const job = await emailMasterService.enqueue('promotion', entry.recipient.email, variables, `campaign:${id}:recipient:${entry.recipient.id}`, { campaignRecipientId: entry.recipient.id, templateVersionId: detail.templateVersionId, priority: 100 });
        await db.update(campaignRecipients).set({ status: job.status === 'render_failed' ? 'failed' : 'queued', deliveryJobId: job.id, variables, suppressionReason: job.status === 'render_failed' ? 'template_render_failed' : null, updatedAt: new Date() }).where(eq(campaignRecipients.id, entry.recipient.id));
      }
    }
    await completeIfSettled(id);
    if (actorId) await audit(id, 'started', actorId, { channel: detail.channel, deliveryEnabled: detail.channel === 'whatsapp' ? env.WHATSAPP_CAMPAIGN_DELIVERY_ENABLED : env.CAMPAIGN_DELIVERY_ENABLED });
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
      const jobIds = await tx.select({ emailId: campaignRecipients.deliveryJobId, messageId: campaignRecipients.messageDeliveryJobId }).from(campaignRecipients).where(eq(campaignRecipients.campaignId, id));
      const emailIds = jobIds.flatMap((entry) => entry.emailId ? [entry.emailId] : []);
      const messageIds = jobIds.flatMap((entry) => entry.messageId ? [entry.messageId] : []);
      if (emailIds.length) await tx.update(emailDeliveryJobs).set({ status: 'cancelled', updatedAt: new Date() }).where(and(inArray(emailDeliveryJobs.id, emailIds), inArray(emailDeliveryJobs.status, ['queued', 'failed', 'unknown'])));
      if (messageIds.length) await tx.update(messageDeliveryJobs).set({ status: 'cancelled', updatedAt: new Date() }).where(and(inArray(messageDeliveryJobs.id, messageIds), inArray(messageDeliveryJobs.status, ['queued', 'failed'])));
      await tx.insert(contentAuditEvents).values({ entityType: 'campaign', entityId: id, action: 'cancelled', actorId });
    });
    return this.detail(id);
  },

  async processScheduled() {
    const due = await db.select({ id: campaigns.id }).from(campaigns).where(and(eq(campaigns.status, 'scheduled'), lte(campaigns.scheduledAt, new Date()))).limit(10);
    for (const campaign of due) await this.start(campaign.id);
    return due.length;
  },

  async test(id: string, actorId: string) {
    const campaign = await this.detail(id);
    const [admin] = await db.select().from(users).where(eq(users.id, actorId)).limit(1);
    if (!admin) throw new NotFoundError('Administrator not found.');
    if (campaign.channel === 'whatsapp') {
      if (!admin.authPhoneE164 || !admin.phoneVerifiedAt) throw new AppError('A verified administrator phone is required for a WhatsApp test.', 409);
      if (!campaign.whatsappTemplateName) throw new AppError('WhatsApp template configuration is missing.', 409);
      const job = await messageService.enqueue({
        channel: 'whatsapp', purpose: 'marketing', eventKey: 'whatsapp_campaign_test', recipient: admin.authPhoneE164,
        templateKey: campaign.whatsappTemplateName, language: campaign.whatsappTemplateLanguage ?? env.MSG91_WHATSAPP_LANGUAGE,
        variables: { bodyValues: resolveBodyValues(campaign.whatsappBodyVariables, { customerName: 'Admin Preview', campaignName: `[TEST] ${campaign.name}` }) },
        dedupeKey: `campaign-test:whatsapp:${id}:${randomUUID()}`,
      });
      await messageService.processJob(job.id);
      return (await db.select().from(messageDeliveryJobs).where(eq(messageDeliveryJobs.id, job.id)).limit(1))[0];
    }
    if (!admin.email) throw new AppError('Add a contact email before sending an email test.', 409);
    if (!campaign.templateVersionId) throw new AppError('Email template configuration is missing.', 409);
    const variables = { customerName: 'Admin Preview', campaignSubject: `[TEST] ${campaign.name}`, campaignMessage: 'This is a campaign test. No audience recipient was contacted.', unsubscribeUrl: `${env.CLIENT_URL}/unsubscribe?token=preview-token` };
    const job = await emailMasterService.enqueue('promotion', admin.email, variables, `campaign-test:${id}:${Date.now()}`, { templateVersionId: campaign.templateVersionId, priority: 1 });
    await emailMasterService.processJob(job.id);
    return (await db.select().from(emailDeliveryJobs).where(eq(emailDeliveryJobs.id, job.id)).limit(1))[0];
  },

  async unsubscribeConfirmation(token: string) {
    const payload = parseUnsubscribeToken(token);
    const [recipient] = await db.select({ id: campaignRecipients.id, campaignName: campaigns.name }).from(campaignRecipients).innerJoin(campaigns, eq(campaigns.id, campaignRecipients.campaignId)).where(and(eq(campaignRecipients.id, payload.recipientId), eq(campaignRecipients.email, payload.email))).limit(1);
    if (!recipient) throw new AppError('Unsubscribe link is no longer valid.', 400);
    const [suppression] = await db.select().from(marketingSuppressions).where(eq(marketingSuppressions.email, payload.email)).limit(1);
    return { email: maskEmail(payload.email), campaignName: recipient.campaignName, alreadyUnsubscribed: Boolean(suppression) };
  },

  async unsubscribe(token: string) {
    const payload = parseUnsubscribeToken(token);
    await db.transaction(async (tx) => {
      await tx.insert(marketingSuppressions).values({ email: payload.email, reason: 'unsubscribe', source: 'campaign_link' }).onConflictDoNothing({ target: marketingSuppressions.email });
      await tx.update(marketingPreferences).set({ optedIn: false, withdrawnAt: new Date(), updatedAt: new Date() }).where(eq(marketingPreferences.email, payload.email));
    });
    return { unsubscribed: true, email: maskEmail(payload.email) };
  },

  async getPreference(userId: string, email: string) {
    const [preference] = await db.select().from(marketingPreferences).where(eq(marketingPreferences.email, normalize(email))).limit(1);
    return preference ?? { userId, email: normalize(email), optedIn: false, provenance: 'no_record' };
  },

  async setPreference(userId: string, email: string, optedIn: boolean) {
    const normalized = normalize(email);
    if (optedIn) await db.delete(marketingSuppressions).where(eq(marketingSuppressions.email, normalized));
    const [preference] = await db.insert(marketingPreferences).values({ userId, email: normalized, optedIn, provenance: 'account_preference_center', consentedAt: optedIn ? new Date() : null, withdrawnAt: optedIn ? null : new Date() })
      .onConflictDoUpdate({ target: marketingPreferences.email, set: { userId, optedIn, provenance: 'account_preference_center', consentedAt: optedIn ? new Date() : null, withdrawnAt: optedIn ? null : new Date(), updatedAt: new Date() } }).returning();
    if (!optedIn) await db.insert(marketingSuppressions).values({ email: normalized, reason: 'preference_withdrawn', source: 'preference_center' }).onConflictDoNothing({ target: marketingSuppressions.email });
    return preference;
  },

  async getMobilePreference(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.authPhoneE164) throw new AppError('A verified phone is required.', 409);
    const [preference] = await db.select().from(mobileMarketingPreferences).where(eq(mobileMarketingPreferences.userId, userId)).limit(1);
    return preference ?? { userId, phone: user.authPhoneE164, whatsappOptedIn: false, provenance: 'no_record' };
  },

  async setMobilePreference(userId: string, whatsappOptedIn: boolean) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.authPhoneE164 || !user.phoneVerifiedAt) throw new AppError('A verified phone is required.', 409);
    if (whatsappOptedIn) await db.delete(whatsappMarketingSuppressions).where(eq(whatsappMarketingSuppressions.phone, user.authPhoneE164));
    const now = new Date();
    const [preference] = await db.insert(mobileMarketingPreferences).values({ userId, phone: user.authPhoneE164, whatsappOptedIn, provenance: 'account_preference_center', consentedAt: whatsappOptedIn ? now : null, withdrawnAt: whatsappOptedIn ? null : now })
      .onConflictDoUpdate({ target: mobileMarketingPreferences.userId, set: { phone: user.authPhoneE164, whatsappOptedIn, provenance: 'account_preference_center', consentedAt: whatsappOptedIn ? now : null, withdrawnAt: whatsappOptedIn ? null : now, updatedAt: now } }).returning();
    if (!whatsappOptedIn) await db.insert(whatsappMarketingSuppressions).values({ phone: user.authPhoneE164, reason: 'preference_withdrawn', source: 'preference_center' }).onConflictDoNothing({ target: whatsappMarketingSuppressions.phone });
    return preference;
  },
};
