import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, lt, lte, max, or, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  campaignRecipients, campaigns, contentAuditEvents, emailDeliveryJobs, emailSendAttempts, emailTemplates, emailTemplateVersions, issuedInvoices, marketingPreferences, marketingSuppressions,
  type StructuredContent,
} from '../../infrastructure/database/schema/index.js';
import { sendRenderedEmail } from '../../infrastructure/mail/mailer.js';
import { env } from '../../config/env.js';
import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../../core/errors/appError.js';
import { EMAIL_EVENT_CATALOG, type EmailEventKey } from './emailCatalog.js';
import { renderStructuredDocument, structuredDocumentSchema, substituteVariables } from './contentDocument.js';

type TemplateDraft = { name?: string; subject: string; preheader?: string | null; document: StructuredContent; requiredVariables?: string[]; expectedRevision: number };

const audit = (entityId: string, action: string, actorId: string, metadata: Record<string, unknown> = {}) =>
  db.insert(contentAuditEvents).values({ entityType: 'email_template', entityId, action, actorId, metadata });

const renderVersion = (version: typeof emailTemplateVersions.$inferSelect, variables: Record<string, unknown>) => ({
  subject: substituteVariables(version.subject, variables, version.requiredVariables),
  html: substituteVariables(version.html, { ...variables, preheader: version.preheader ?? '' }, version.requiredVariables),
  text: substituteVariables(version.plainText, variables, version.requiredVariables),
});

const safeSamples: Record<string, unknown> = {
  customerName: 'Sample Customer', otp: '123456', resetUrl: `${env.CLIENT_URL}/reset-password?token=preview-token`,
  orderNumber: 'PE-PREVIEW-001', orderTotal: 'INR 2,358.82', returnStatus: 'approved',
  campaignSubject: 'A sample Prem Electronics update', campaignMessage: 'Preview content is generated with safe example data.',
  unsubscribeUrl: `${env.CLIENT_URL}/unsubscribe?token=preview-token`,
};

export const emailMasterService = {
  list: () => db.select().from(emailTemplates).orderBy(asc(emailTemplates.category), asc(emailTemplates.name)),

  async detail(id: string) {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
    if (!template) throw new NotFoundError('Email template not found.');
    const versions = await db.select().from(emailTemplateVersions).where(eq(emailTemplateVersions.templateId, id)).orderBy(desc(emailTemplateVersions.version));
    return { ...template, versions };
  },

  async ensureSystemTemplate(eventKey: EmailEventKey) {
    const catalog = EMAIL_EVENT_CATALOG[eventKey];
    const [existing] = await db.select().from(emailTemplates).where(eq(emailTemplates.eventKey, eventKey)).limit(1);
    if (existing?.activeVersionId) {
      const [version] = await db.select().from(emailTemplateVersions).where(eq(emailTemplateVersions.id, existing.activeVersionId)).limit(1);
      if (version) return { template: existing, version };
    }
    const rendered = renderStructuredDocument(catalog.document);
    return db.transaction(async (tx) => {
      let template = existing;
      if (!template) {
        [template] = await tx.insert(emailTemplates).values({ eventKey, name: catalog.name, category: catalog.category, status: 'draft', subjectDraft: catalog.subject, documentDraft: catalog.document, requiredVariables: [...catalog.required] }).onConflictDoNothing({ target: emailTemplates.eventKey }).returning();
        if (!template) [template] = await tx.select().from(emailTemplates).where(eq(emailTemplates.eventKey, eventKey)).limit(1);
      }
      if (!template) throw new Error(`Unable to initialize ${eventKey} email template.`);
      if (template.activeVersionId) {
        const [published] = await tx.select().from(emailTemplateVersions).where(eq(emailTemplateVersions.id, template.activeVersionId)).limit(1);
        if (published) return { template, version: published };
      }
      const [version] = await tx.insert(emailTemplateVersions).values({ templateId: template.id, version: 1, subject: template.subjectDraft, preheader: template.preheaderDraft, document: template.documentDraft, html: rendered.html, plainText: rendered.text, requiredVariables: template.requiredVariables, changeNote: 'System bootstrap version' }).onConflictDoNothing({ target: [emailTemplateVersions.templateId, emailTemplateVersions.version] }).returning();
      const selected = version ?? (await tx.select().from(emailTemplateVersions).where(and(eq(emailTemplateVersions.templateId, template.id), eq(emailTemplateVersions.version, 1))).limit(1))[0];
      const [updated] = await tx.update(emailTemplates).set({ status: 'published', activeVersionId: selected.id, updatedAt: new Date() }).where(eq(emailTemplates.id, template.id)).returning();
      return { template: updated, version: selected };
    });
  },

  async create(input: { eventKey: EmailEventKey; name: string; category: string; subject: string; preheader?: string; document: StructuredContent; requiredVariables: string[] }, actorId: string) {
    if (input.category !== EMAIL_EVENT_CATALOG[input.eventKey].category) throw new AppError('Template category must match the stable event key.', 400);
    const [created] = await db.insert(emailTemplates).values({ eventKey: input.eventKey, name: input.name, category: input.category, subjectDraft: input.subject, preheaderDraft: input.preheader, documentDraft: input.document, requiredVariables: input.requiredVariables, createdBy: actorId, updatedBy: actorId }).returning();
    await audit(created.id, 'created', actorId); return created;
  },

  async updateDraft(id: string, input: TemplateDraft, actorId: string) {
    structuredDocumentSchema.parse(input.document);
    const [updated] = await db.update(emailTemplates).set({ name: input.name, subjectDraft: input.subject, preheaderDraft: input.preheader, documentDraft: input.document, requiredVariables: input.requiredVariables, draftRevision: sql`${emailTemplates.draftRevision} + 1`, updatedBy: actorId, updatedAt: new Date() })
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.draftRevision, input.expectedRevision), sql`${emailTemplates.status} <> 'archived'`)).returning();
    if (!updated) throw new ConflictError('The email draft changed or is archived. Reload and try again.');
    await audit(id, 'draft_updated', actorId, { revision: updated.draftRevision }); return updated;
  },

  async publish(id: string, actorId: string, changeNote?: string) {
    return db.transaction(async (tx) => {
      const [template] = await tx.select().from(emailTemplates).where(eq(emailTemplates.id, id)).for('update').limit(1);
      if (!template || template.status === 'archived') throw new NotFoundError('Active email template not found.');
      const rendered = renderStructuredDocument(template.documentDraft);
      const mandatory = [...EMAIL_EVENT_CATALOG[template.eventKey as EmailEventKey].required];
      const missingMandatory = mandatory.filter((variable) => !template.requiredVariables.includes(variable));
      if (missingMandatory.length) throw new AppError(`Stable event variables cannot be removed: ${missingMandatory.join(', ')}`, 400);
      const source = `${template.subjectDraft}\n${template.preheaderDraft ?? ''}\n${rendered.html}`;
      const unused = template.requiredVariables.filter((variable) => !source.includes(`{{${variable}}}`));
      if (unused.length) throw new AppError(`Required variables are not used: ${unused.join(', ')}`, 400);
      if (template.category === 'marketing' && !template.requiredVariables.includes('unsubscribeUrl')) throw new AppError('Marketing templates must require unsubscribeUrl.', 400);
      const [latest] = await tx.select({ value: max(emailTemplateVersions.version) }).from(emailTemplateVersions).where(eq(emailTemplateVersions.templateId, id));
      const [version] = await tx.insert(emailTemplateVersions).values({ templateId: id, version: Number(latest?.value ?? 0) + 1, subject: template.subjectDraft, preheader: template.preheaderDraft, document: template.documentDraft, html: rendered.html, plainText: rendered.text, requiredVariables: template.requiredVariables, changeNote, publishedBy: actorId }).returning();
      const [updated] = await tx.update(emailTemplates).set({ status: 'published', activeVersionId: version.id, updatedBy: actorId, updatedAt: new Date() }).where(eq(emailTemplates.id, id)).returning();
      await tx.insert(contentAuditEvents).values({ entityType: 'email_template', entityId: id, action: 'published', actorId, metadata: { version: version.version } });
      return { template: updated, version };
    });
  },

  async restore(id: string, versionId: string, actorId: string) {
    const [version] = await db.select().from(emailTemplateVersions).where(and(eq(emailTemplateVersions.id, versionId), eq(emailTemplateVersions.templateId, id))).limit(1);
    if (!version) throw new NotFoundError('Email template version not found.');
    const [updated] = await db.update(emailTemplates).set({ subjectDraft: version.subject, preheaderDraft: version.preheader, documentDraft: version.document, requiredVariables: version.requiredVariables, status: 'draft', draftRevision: sql`${emailTemplates.draftRevision} + 1`, updatedBy: actorId, updatedAt: new Date() }).where(eq(emailTemplates.id, id)).returning();
    await audit(id, 'version_restored_to_draft', actorId, { sourceVersion: version.version }); return updated;
  },

  async archive(id: string, actorId: string) {
    const [updated] = await db.update(emailTemplates).set({ status: 'archived', archivedAt: new Date(), updatedBy: actorId, updatedAt: new Date() }).where(eq(emailTemplates.id, id)).returning();
    if (!updated) throw new NotFoundError('Email template not found.');
    await audit(id, 'archived', actorId); return updated;
  },

  preview(input: { subject: string; preheader?: string; document: StructuredContent; variables?: Record<string, unknown> }) {
    const rendered = renderStructuredDocument(input.document);
    const variables = { ...safeSamples, ...input.variables, preheader: input.preheader ?? '' };
    return { subject: substituteVariables(input.subject, variables), html: substituteVariables(rendered.html, variables), text: substituteVariables(rendered.text, variables), sampleVariables: safeSamples };
  },

  async enqueue(eventKey: EmailEventKey, recipient: string, variables: Record<string, unknown>, dedupeKey: string, options: { orderId?: string; priority?: number; expiresAt?: Date; campaignRecipientId?: string; templateVersionId?: string } = {}) {
    const version = options.templateVersionId
      ? (await db.select().from(emailTemplateVersions).where(eq(emailTemplateVersions.id, options.templateVersionId)).limit(1))[0]
      : (await this.ensureSystemTemplate(eventKey)).version;
    if (!version) throw new NotFoundError('Pinned email template version not found.');
    let rendered: ReturnType<typeof renderVersion>;
    try {
      rendered = renderVersion(version, variables);
    } catch (error: any) {
      const [failed] = await db.insert(emailDeliveryJobs).values({ eventKey, templateVersionId: version.id, orderId: options.orderId, campaignRecipientId: options.campaignRecipientId, recipient: recipient.trim().toLowerCase(), variables, status: 'render_failed', priority: options.priority ?? 50, dedupeKey, expiresAt: options.expiresAt, lastError: String(error?.message ?? error).slice(0, 1000) }).onConflictDoNothing({ target: emailDeliveryJobs.dedupeKey }).returning();
      return failed ?? (await db.select().from(emailDeliveryJobs).where(eq(emailDeliveryJobs.dedupeKey, dedupeKey)).limit(1))[0];
    }
    const [job] = await db.insert(emailDeliveryJobs).values({ eventKey, templateVersionId: version.id, orderId: options.orderId, campaignRecipientId: options.campaignRecipientId, recipient: recipient.trim().toLowerCase(), variables, subjectSnapshot: rendered.subject, htmlSnapshot: rendered.html, textSnapshot: rendered.text, priority: options.priority ?? (EMAIL_EVENT_CATALOG[eventKey].category === 'auth' ? 10 : 50), dedupeKey, expiresAt: options.expiresAt }).onConflictDoNothing({ target: emailDeliveryJobs.dedupeKey }).returning();
    if (job) return job;
    return (await db.select().from(emailDeliveryJobs).where(eq(emailDeliveryJobs.dedupeKey, dedupeKey)).limit(1))[0];
  },

  async enqueueAndAttempt(eventKey: EmailEventKey, recipient: string, variables: Record<string, unknown>, dedupeKey: string, options: { orderId?: string; priority?: number; expiresAt?: Date } = {}) {
    const job = await this.enqueue(eventKey, recipient, variables, dedupeKey, options);
    if (job?.status === 'queued' || job?.status === 'failed') await this.processJob(job.id);
    return (await db.select().from(emailDeliveryJobs).where(eq(emailDeliveryJobs.id, job.id)).limit(1))[0];
  },

  async processJob(id: string, workerId = `worker-${process.pid}`) {
    const now = new Date();
    const [candidate] = await db.select({ campaignRecipientId: emailDeliveryJobs.campaignRecipientId, recipient: emailDeliveryJobs.recipient }).from(emailDeliveryJobs).where(eq(emailDeliveryJobs.id, id)).limit(1);
    if (candidate?.campaignRecipientId) {
      const [campaignRecipient] = await db.select({ campaignStatus: campaigns.status, optedIn: marketingPreferences.optedIn, suppressionId: marketingSuppressions.id })
        .from(campaignRecipients).innerJoin(campaigns, eq(campaigns.id, campaignRecipients.campaignId))
        .leftJoin(marketingPreferences, eq(marketingPreferences.email, campaignRecipients.email)).leftJoin(marketingSuppressions, eq(marketingSuppressions.email, campaignRecipients.email))
        .where(eq(campaignRecipients.id, candidate.campaignRecipientId)).limit(1);
      if (campaignRecipient?.campaignStatus !== 'running' || !env.CAMPAIGN_DELIVERY_ENABLED) return false;
      if (campaignRecipient.suppressionId || campaignRecipient.optedIn !== true) {
        await db.update(emailDeliveryJobs).set({ status: 'cancelled', lastError: 'Suppressed immediately before SMTP submission.', updatedAt: new Date() }).where(eq(emailDeliveryJobs.id, id));
        await db.update(campaignRecipients).set({ status: 'suppressed', suppressionReason: campaignRecipient.suppressionId ? 'suppression_list' : 'consent_withdrawn', updatedAt: new Date() }).where(eq(campaignRecipients.id, candidate.campaignRecipientId));
        return true;
      }
    }
    const [job] = await db.update(emailDeliveryJobs).set({ status: 'submitting', leaseOwner: workerId, leaseExpiresAt: new Date(Date.now() + 5 * 60_000), updatedAt: now })
      .where(and(eq(emailDeliveryJobs.id, id), inArray(emailDeliveryJobs.status, ['queued', 'failed', 'unknown']), lte(emailDeliveryJobs.nextAttemptAt, now), lt(emailDeliveryJobs.attempts, emailDeliveryJobs.maxAttempts), or(sql`${emailDeliveryJobs.leaseExpiresAt} IS NULL`, lte(emailDeliveryJobs.leaseExpiresAt, now)))).returning();
    if (!job) return false;
    const attemptNumber = job.attempts + 1;
    const [attempt] = await db.insert(emailSendAttempts).values({ jobId: id, attemptNumber, status: 'submitting' }).returning();
    try {
      if (job.expiresAt && job.expiresAt <= new Date()) throw new Error('Email job expired before submission.');
      const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];
      if (job.eventKey === 'order_confirmed' && job.orderId) {
        const [invoice] = await db.select().from(issuedInvoices).where(eq(issuedInvoices.orderId, job.orderId)).limit(1);
        if (invoice) attachments.push({ filename: `${invoice.invoiceNumber}.pdf`, content: invoice.pdfBytes, contentType: 'application/pdf' });
      }
      const unsubscribeUrl = job.eventKey === 'promotion' ? String(job.variables.unsubscribeUrl ?? '') : undefined;
      const info = await sendRenderedEmail({ to: job.recipient, subject: job.subjectSnapshot!, html: job.htmlSnapshot!, text: job.textSnapshot!, attachments, unsubscribeUrl });
      const accepted = info.accepted.map(String).some((email) => email.toLowerCase() === job.recipient.toLowerCase());
      const status = accepted ? 'smtp_accepted' : 'unknown';
      await db.update(emailDeliveryJobs).set({ status, attempts: attemptNumber, providerMessageId: info.messageId, acceptedAt: accepted ? new Date() : null, leaseOwner: null, leaseExpiresAt: null, lastError: accepted ? null : 'SMTP response did not explicitly accept recipient.', updatedAt: new Date() }).where(eq(emailDeliveryJobs.id, id));
      await db.update(emailSendAttempts).set({ status, providerMessageId: info.messageId, completedAt: new Date() }).where(eq(emailSendAttempts.id, attempt.id));
      if (job.campaignRecipientId) await db.update(campaignRecipients).set({ status: accepted ? 'smtp_accepted' : 'failed', updatedAt: new Date() }).where(eq(campaignRecipients.id, job.campaignRecipientId));
    } catch (error: any) {
      const final = attemptNumber >= job.maxAttempts;
      const message = String(error?.message ?? error).slice(0, 1000);
      await db.update(emailDeliveryJobs).set({ status: 'failed', attempts: attemptNumber, lastError: message, nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** attemptNumber) * 60_000), leaseOwner: null, leaseExpiresAt: null, updatedAt: new Date() }).where(eq(emailDeliveryJobs.id, id));
      await db.update(emailSendAttempts).set({ status: 'failed', error: `${final ? 'Final attempt: ' : ''}${message}`, completedAt: new Date() }).where(eq(emailSendAttempts.id, attempt.id));
      if (job.campaignRecipientId) await db.update(campaignRecipients).set({ status: final ? 'failed' : 'queued', updatedAt: new Date() }).where(eq(campaignRecipients.id, job.campaignRecipientId));
    }
    if (job.campaignRecipientId) {
      const [recipient] = await db.select({ campaignId: campaignRecipients.campaignId }).from(campaignRecipients).where(eq(campaignRecipients.id, job.campaignRecipientId)).limit(1);
      if (recipient) {
        const [remaining] = await db.select({ count: sql<number>`count(*)::int` }).from(campaignRecipients).where(and(eq(campaignRecipients.campaignId, recipient.campaignId), inArray(campaignRecipients.status, ['pending', 'queued'])));
        if (Number(remaining?.count ?? 0) === 0) await db.update(campaigns).set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() }).where(eq(campaigns.id, recipient.campaignId));
      }
    }
    return true;
  },

  async processQueue(limit = 20) {
    const candidates = await db.select({ id: emailDeliveryJobs.id }).from(emailDeliveryJobs).where(and(inArray(emailDeliveryJobs.status, ['queued', 'failed', 'unknown']), lte(emailDeliveryJobs.nextAttemptAt, new Date()), lt(emailDeliveryJobs.attempts, emailDeliveryJobs.maxAttempts))).orderBy(asc(emailDeliveryJobs.priority), asc(emailDeliveryJobs.createdAt)).limit(limit);
    for (const candidate of candidates) await this.processJob(candidate.id);
    return candidates.length;
  },

  logs: (limit = 100) => db.select().from(emailDeliveryJobs).orderBy(desc(emailDeliveryJobs.createdAt)).limit(Math.min(limit, 200)),

  async testSend(templateId: string, recipient: string, variables: Record<string, unknown>, adminEmail: string) {
    const allowed = recipient.toLowerCase() === adminEmail.toLowerCase() || env.EMAIL_TEST_RECIPIENTS.includes(recipient.toLowerCase());
    if (!allowed) throw new ForbiddenError('Test email recipients must be the signed-in admin or an EMAIL_TEST_RECIPIENTS allowlisted address.');
    const detail = await this.detail(templateId);
    if (!detail.activeVersionId) throw new AppError('Publish the template before sending a test.', 409);
    const version = detail.versions.find((entry) => entry.id === detail.activeVersionId)!;
    const rendered = renderVersion(version, { ...safeSamples, ...variables });
    const [job] = await db.insert(emailDeliveryJobs).values({ eventKey: detail.eventKey, templateVersionId: version.id, recipient: recipient.toLowerCase(), variables: { ...safeSamples, ...variables }, subjectSnapshot: `[TEST] ${rendered.subject}`, htmlSnapshot: rendered.html, textSnapshot: rendered.text, priority: 1, dedupeKey: `test:${templateId}:${randomUUID()}` }).returning();
    await this.processJob(job.id); return (await db.select().from(emailDeliveryJobs).where(eq(emailDeliveryJobs.id, job.id)).limit(1))[0];
  },
};
