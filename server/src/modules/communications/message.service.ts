import { and, asc, eq, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { env } from '../../config/env.js';
import logger from '../../core/logger/logger.js';
import { db } from '../../infrastructure/database/db.js';
import {
  campaignRecipients,
  campaigns,
  messageDeliveryJobs,
  mobileMarketingPreferences,
  whatsappMarketingSuppressions,
  users,
  type MessageDeliveryJob,
} from '../../infrastructure/database/schema/index.js';
import { messagingProvider } from '../../infrastructure/messaging/msg91MessagingProvider.js';
import { getInvoicePublicUrl } from '../invoiceMaster/invoice.service.js';

const stringRecord = (value: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, String(entry)]));

const bodyValues = (value: Record<string, unknown>): string[] =>
  Array.isArray(value.bodyValues) ? value.bodyValues.map(String) : [];

async function submit(job: MessageDeliveryJob) {
  if (job.channel === 'sms') {
    return messagingProvider.sendSms({
      recipient: job.recipient,
      templateId: job.templateKey,
      variables: stringRecord(job.variables),
    });
  }
  const vars = job.variables as Record<string, unknown>;
  return messagingProvider.sendWhatsapp({
    recipient: job.recipient,
    templateName: job.templateKey,
    language: job.language ?? env.MSG91_WHATSAPP_LANGUAGE,
    namespace: (vars?.namespace as string) || (job.templateKey === env.MSG91_WHATSAPP_ORDER_CONFIRMED_TEMPLATE_NAME ? env.MSG91_WHATSAPP_ORDER_CONFIRMED_NAMESPACE : undefined),
    bodyValues: bodyValues(vars),
    header: vars?.header as any,
    button: vars?.button as any,
    components: vars?.components as any,
  });
}

async function markCampaignComplete(recipientId: string) {
  const [recipient] = await db.select({ campaignId: campaignRecipients.campaignId })
    .from(campaignRecipients).where(eq(campaignRecipients.id, recipientId)).limit(1);
  if (!recipient) return;
  const [remaining] = await db.select({ count: sql<number>`count(*)::int` })
    .from(campaignRecipients)
    .where(and(eq(campaignRecipients.campaignId, recipient.campaignId), inArray(campaignRecipients.status, ['pending', 'queued'])));
  if (Number(remaining?.count ?? 0) === 0) {
    await db.update(campaigns).set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
      .where(eq(campaigns.id, recipient.campaignId));
  }
}

export const messageService = {
  async enqueue(input: {
    channel: 'sms' | 'whatsapp';
    purpose: 'transactional' | 'marketing';
    eventKey: string;
    recipient: string;
    templateKey: string;
    language?: string;
    variables?: Record<string, unknown>;
    dedupeKey: string;
    campaignRecipientId?: string;
  }) {
    const [created] = await db.insert(messageDeliveryJobs).values({
      ...input,
      variables: input.variables ?? {},
    }).onConflictDoNothing({ target: messageDeliveryJobs.dedupeKey }).returning();
    return created ?? (await db.select().from(messageDeliveryJobs).where(eq(messageDeliveryJobs.dedupeKey, input.dedupeKey)).limit(1))[0];
  },

  async enqueueWelcome(user: { id: string; name: string; authPhoneE164: string | null }, whatsappConsent: boolean) {
    if (!env.TRANSACTIONAL_MESSAGING_ENABLED || !user.authPhoneE164) return;
    const jobs: MessageDeliveryJob[] = [];
    if (env.MSG91_SMS_WELCOME_TEMPLATE_ID) {
      jobs.push(await this.enqueue({
        channel: 'sms', purpose: 'transactional', eventKey: 'customer_welcome',
        recipient: user.authPhoneE164, templateKey: env.MSG91_SMS_WELCOME_TEMPLATE_ID,
        variables: { VAR1: user.name }, dedupeKey: `welcome:sms:${user.id}`,
      }));
    }
    if (whatsappConsent && env.MSG91_WHATSAPP_WELCOME_TEMPLATE_NAME) {
      jobs.push(await this.enqueue({
        channel: 'whatsapp', purpose: 'transactional', eventKey: 'customer_welcome',
        recipient: user.authPhoneE164, templateKey: env.MSG91_WHATSAPP_WELCOME_TEMPLATE_NAME,
        language: env.MSG91_WHATSAPP_LANGUAGE, variables: { bodyValues: [user.name] },
        dedupeKey: `welcome:whatsapp:${user.id}`,
      }));
    }
    for (const job of jobs) {
      if (job.status === 'queued' || job.status === 'failed') await this.processJob(job.id);
    }
  },

  async enqueueOrderConfirmedWhatsapp(
    order: {
      id: string;
      orderNumber: string;
      total: string | number;
      invoiceNumber?: string | null;
      shippingAddress?: { fullName?: string; phone?: string } | null;
      userId?: string | null;
    },
    overridePhone?: string | null,
    overrideCustomerName?: string | null
  ) {
    if (!env.TRANSACTIONAL_MESSAGING_ENABLED) return null;

    let recipientPhone = overridePhone?.trim() || null;
    let customerName = overrideCustomerName?.trim() || null;

    if ((!recipientPhone || !customerName) && order.userId) {
      const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
      if (user) {
        if (!recipientPhone) recipientPhone = user.authPhoneE164;
        if (!customerName) customerName = user.name;
      }
    }

    if (!recipientPhone && order.shippingAddress?.phone) {
      recipientPhone = order.shippingAddress.phone;
    }

    if (!customerName && order.shippingAddress?.fullName) {
      customerName = order.shippingAddress.fullName;
    }

    if (!recipientPhone) {
      logger.warn('Order confirmation WhatsApp message could not find a recipient phone number.', { orderId: order.id });
      return null;
    }

    let cleanPhone = recipientPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const formattedTotal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(order.total));
    const finalCustomerName = customerName || 'Valued Customer';
    const mediaUrl = getInvoicePublicUrl(order.id);
    const invoiceFilename = `${order.invoiceNumber ?? order.orderNumber}.pdf`;

    const job = await this.enqueue({
      channel: 'whatsapp',
      purpose: 'transactional',
      eventKey: 'order_confirmed',
      recipient: cleanPhone,
      templateKey: env.MSG91_WHATSAPP_ORDER_CONFIRMED_TEMPLATE_NAME,
      language: env.MSG91_WHATSAPP_LANGUAGE,
      dedupeKey: `order-confirmed:whatsapp:${order.id}`,
      variables: {
        namespace: env.MSG91_WHATSAPP_ORDER_CONFIRMED_NAMESPACE,
        header: {
          type: 'document',
          filename: invoiceFilename,
          value: mediaUrl,
        },
        bodyValues: [finalCustomerName, order.orderNumber, formattedTotal],
        button: {
          subtype: 'url',
          type: 'text',
          value: order.id,
        },
      },
    });

    if (job && (job.status === 'queued' || job.status === 'failed')) {
      await this.processJob(job.id);
    }

    return job;
  },

  async processJob(id: string, workerId = `message-worker-${process.pid}`) {
    const [candidate] = await db.select().from(messageDeliveryJobs).where(eq(messageDeliveryJobs.id, id)).limit(1);
    if (!candidate) return false;

    if (candidate.purpose === 'transactional' && !env.TRANSACTIONAL_MESSAGING_ENABLED) return false;
    if (candidate.campaignRecipientId) {
      if (!env.WHATSAPP_CAMPAIGN_DELIVERY_ENABLED) return false;
      const [eligibility] = await db.select({
        campaignStatus: campaigns.status,
        optedIn: mobileMarketingPreferences.whatsappOptedIn,
        suppressionId: whatsappMarketingSuppressions.id,
      }).from(campaignRecipients)
        .innerJoin(campaigns, eq(campaigns.id, campaignRecipients.campaignId))
        .leftJoin(mobileMarketingPreferences, eq(mobileMarketingPreferences.phone, campaignRecipients.phone))
        .leftJoin(whatsappMarketingSuppressions, eq(whatsappMarketingSuppressions.phone, campaignRecipients.phone))
        .where(eq(campaignRecipients.id, candidate.campaignRecipientId)).limit(1);
      if (eligibility?.campaignStatus !== 'running') return false;
      if (eligibility.optedIn !== true || eligibility.suppressionId) {
        await db.update(messageDeliveryJobs).set({ status: 'cancelled', lastError: 'WhatsApp consent withdrawn before submission.', updatedAt: new Date() }).where(eq(messageDeliveryJobs.id, id));
        await db.update(campaignRecipients).set({ status: 'suppressed', suppressionReason: eligibility.suppressionId ? 'suppression_list' : 'consent_withdrawn', updatedAt: new Date() }).where(eq(campaignRecipients.id, candidate.campaignRecipientId));
        await markCampaignComplete(candidate.campaignRecipientId);
        return true;
      }
    }

    const now = new Date();
    const [job] = await db.update(messageDeliveryJobs).set({
      status: 'submitting', leaseOwner: workerId,
      leaseExpiresAt: new Date(Date.now() + 5 * 60_000), updatedAt: now,
    }).where(and(
      eq(messageDeliveryJobs.id, id),
      inArray(messageDeliveryJobs.status, ['queued', 'failed']),
      lte(messageDeliveryJobs.nextAttemptAt, now),
      lt(messageDeliveryJobs.attempts, messageDeliveryJobs.maxAttempts),
      or(isNull(messageDeliveryJobs.leaseExpiresAt), lte(messageDeliveryJobs.leaseExpiresAt, now)),
    )).returning();
    if (!job) return false;

    const attempt = job.attempts + 1;
    try {
      const accepted = await submit(job);
      await db.update(messageDeliveryJobs).set({
        status: 'provider_accepted', attempts: attempt,
        providerMessageId: accepted.providerMessageId, acceptedAt: new Date(),
        leaseOwner: null, leaseExpiresAt: null, lastError: null, updatedAt: new Date(),
      }).where(eq(messageDeliveryJobs.id, id));
      if (job.campaignRecipientId) {
        await db.update(campaignRecipients).set({ status: 'provider_accepted', updatedAt: new Date() }).where(eq(campaignRecipients.id, job.campaignRecipientId));
        await markCampaignComplete(job.campaignRecipientId);
      }
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error).slice(0, 1000);
      await db.update(messageDeliveryJobs).set({
        status: 'failed', attempts: attempt, lastError: message,
        nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attempt) * 60_000),
        leaseOwner: null, leaseExpiresAt: null, updatedAt: new Date(),
      }).where(eq(messageDeliveryJobs.id, id));
      if (job.campaignRecipientId && attempt >= job.maxAttempts) {
        await db.update(campaignRecipients).set({ status: 'failed', updatedAt: new Date() }).where(eq(campaignRecipients.id, job.campaignRecipientId));
        await markCampaignComplete(job.campaignRecipientId);
      }
      logger.error('Mobile message submission failed.', { jobId: job.id, channel: job.channel, error: message });
    }
    return true;
  },

  async processQueue(limit = 20) {
    const enabledPurposes: Array<'transactional' | 'marketing'> = [];
    if (env.TRANSACTIONAL_MESSAGING_ENABLED) enabledPurposes.push('transactional');
    if (env.WHATSAPP_CAMPAIGN_DELIVERY_ENABLED) enabledPurposes.push('marketing');
    if (!enabledPurposes.length) return 0;
    const jobs = await db.select({ id: messageDeliveryJobs.id }).from(messageDeliveryJobs)
      .where(and(inArray(messageDeliveryJobs.purpose, enabledPurposes), inArray(messageDeliveryJobs.status, ['queued', 'failed']), lte(messageDeliveryJobs.nextAttemptAt, new Date()), lt(messageDeliveryJobs.attempts, messageDeliveryJobs.maxAttempts)))
      .orderBy(asc(messageDeliveryJobs.createdAt)).limit(limit);
    for (const job of jobs) await this.processJob(job.id);
    return jobs.length;
  },
};
