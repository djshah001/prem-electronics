import { createHash } from 'node:crypto';
import { and, desc, eq, max, ne, sql } from 'drizzle-orm';
import { db } from '../../infrastructure/database/db.js';
import {
  contentAuditEvents, invoiceTemplates, invoiceTemplateVersions, issuedInvoices,
  type InvoiceTemplateConfig,
} from '../../infrastructure/database/schema/index.js';
import { env } from '../../config/env.js';
import { AppError, ConflictError, NotFoundError } from '../../core/errors/appError.js';
import { ordersService } from '../orders/orders.service.js';
import { renderInvoicePdf, type InvoiceRenderData } from './invoice.renderer.js';

export const defaultInvoiceConfig = (): InvoiceTemplateConfig => ({
  page: { size: 'A4', marginMm: 10, repeatTableHeader: true, showPageNumbers: true },
  labels: { invoice: 'Tax Invoice', consignee: 'Consignee (Ship to)', buyer: 'Buyer (Bill to)', grandTotal: 'Grand Total', amountWords: 'Amount chargeable in words' },
  sections: ['seller', 'buyer', 'metadata', 'items', 'taxSummary', 'amountWords', 'bank', 'terms', 'signature'].map((key, order) => ({ key, visible: true, order })),
  merchant: {
    name: env.MERCHANT_NAME, gstin: env.MERCHANT_GSTIN, pan: env.MERCHANT_PAN, address: env.MERCHANT_ADDRESS,
    stateCode: env.SUPPLIER_STATE_CODE, phone: env.MERCHANT_PHONE, email: env.MERCHANT_EMAIL,
    bankDetails: env.MERCHANT_BANK_DETAILS, declaration: env.MERCHANT_DECLARATION,
    signatureLabel: env.MERCHANT_SIGNATURE_LABEL,
  },
  terms: 'Subject to applicable terms and conditions.',
});

const audit = (entityId: string, action: string, actorId: string, metadata: Record<string, unknown> = {}) =>
  db.insert(contentAuditEvents).values({ entityType: 'invoice_template', entityId, action, actorId, metadata });

const sampleInvoice = (): InvoiceRenderData => ({
  merchant: { name: env.MERCHANT_NAME, address: env.MERCHANT_ADDRESS },
  order: {
    invoiceNumber: 'INV-PREVIEW-001', orderNumber: 'PREVIEW-001', createdAt: new Date().toISOString(), invoiceIssuedAt: new Date().toISOString(),
    paymentMethod: 'Online', purchaseOrderReference: 'PO-PREVIEW', shippingAddress: { fullName: 'Sample Customer', street: '42 Sample Market Road', city: 'Vadodara', state: 'Gujarat', pincode: '390001', country: 'India' },
    billingAddress: { fullName: 'Sample Customer', street: '42 Sample Market Road', city: 'Vadodara', state: 'Gujarat', pincode: '390001', country: 'India' },
    taxSnapshot: { placeOfSupplyState: 'Gujarat', taxableMinor: 199900, cgstMinor: 17991, sgstMinor: 17991, igstMinor: 0, totalTaxMinor: 35982 },
    amountMinor: 235882, total: 2358.82, tax: 359.82,
  },
  items: Array.from({ length: 4 }, (_, index) => ({ productTitle: `Sample electronic product ${index + 1}`, hsnCodeSnapshot: '8517', skuSnapshot: `SKU-00${index + 1}`, quantity: 1, priceAtPurchase: 589.7, unitPriceMinor: 49975, taxableMinor: 49975, gstRateBps: 1800, cgstMinor: 4498, sgstMinor: 4498, igstMinor: 0, lineTotalMinor: 58970 })),
});

// Invoices issued before the versioned renderer launch remain explicitly legacy.
const VERSIONED_INVOICE_CUTOFF = new Date('2026-10-05T00:00:00.000Z');

export const invoiceMasterService = {
  list: () => db.select().from(invoiceTemplates).orderBy(desc(invoiceTemplates.updatedAt)),

  async detail(id: string) {
    const [template] = await db.select().from(invoiceTemplates).where(eq(invoiceTemplates.id, id)).limit(1);
    if (!template) throw new NotFoundError('Invoice template not found.');
    const versions = await db.select().from(invoiceTemplateVersions).where(eq(invoiceTemplateVersions.templateId, id)).orderBy(desc(invoiceTemplateVersions.version));
    return { ...template, versions };
  },

  async create(input: { name: string; documentType: string; config: InvoiceTemplateConfig }, actorId: string) {
    const [template] = await db.insert(invoiceTemplates).values({ ...input, draftConfig: input.config, createdBy: actorId, updatedBy: actorId }).returning();
    await audit(template.id, 'created', actorId);
    return template;
  },

  async duplicate(id: string, actorId: string) {
    const source = await this.detail(id);
    return this.create({ name: `${source.name} (Copy)`, documentType: source.documentType, config: source.draftConfig }, actorId);
  },

  async updateDraft(id: string, input: { name?: string; config: InvoiceTemplateConfig; expectedRevision: number }, actorId: string) {
    const [updated] = await db.update(invoiceTemplates).set({ name: input.name, draftConfig: input.config, draftRevision: sql`${invoiceTemplates.draftRevision} + 1`, updatedBy: actorId, updatedAt: new Date() })
      .where(and(eq(invoiceTemplates.id, id), eq(invoiceTemplates.draftRevision, input.expectedRevision), ne(invoiceTemplates.status, 'archived'))).returning();
    if (!updated) throw new ConflictError('The invoice draft changed or is archived. Reload and try again.');
    await audit(id, 'draft_updated', actorId, { revision: updated.draftRevision });
    return updated;
  },

  async publish(id: string, actorId: string, input: { changeNote?: string; makeDefault: boolean }) {
    return db.transaction(async (tx) => {
      const [template] = await tx.select().from(invoiceTemplates).where(eq(invoiceTemplates.id, id)).for('update').limit(1);
      if (!template || template.status === 'archived') throw new NotFoundError('Active invoice template not found.');
      const visible = new Set(template.draftConfig.sections.filter((section) => section.visible).map((section) => section.key));
      const missingRequired = ['seller', 'buyer', 'metadata', 'items', 'taxSummary', 'amountWords', 'signature'].filter((key) => !visible.has(key));
      if (missingRequired.length) throw new AppError(`Required invoice sections cannot be hidden: ${missingRequired.join(', ')}`, 400);
      const [latest] = await tx.select({ value: max(invoiceTemplateVersions.version) }).from(invoiceTemplateVersions).where(eq(invoiceTemplateVersions.templateId, id));
      const [version] = await tx.insert(invoiceTemplateVersions).values({ templateId: id, version: Number(latest?.value ?? 0) + 1, config: template.draftConfig, changeNote: input.changeNote, publishedBy: actorId }).returning();
      if (input.makeDefault) await tx.update(invoiceTemplates).set({ isDefault: false }).where(eq(invoiceTemplates.documentType, template.documentType));
      const [updated] = await tx.update(invoiceTemplates).set({ status: 'published', activeVersionId: version.id, isDefault: input.makeDefault || template.isDefault, updatedBy: actorId, updatedAt: new Date() }).where(eq(invoiceTemplates.id, id)).returning();
      await tx.insert(contentAuditEvents).values({ entityType: 'invoice_template', entityId: id, action: 'published', actorId, metadata: { version: version.version, makeDefault: input.makeDefault } });
      return { template: updated, version };
    });
  },

  async restore(id: string, versionId: string, actorId: string) {
    const [version] = await db.select().from(invoiceTemplateVersions).where(and(eq(invoiceTemplateVersions.id, versionId), eq(invoiceTemplateVersions.templateId, id))).limit(1);
    if (!version) throw new NotFoundError('Invoice template version not found.');
    const [updated] = await db.update(invoiceTemplates).set({ draftConfig: version.config, draftRevision: sql`${invoiceTemplates.draftRevision} + 1`, status: 'draft', updatedBy: actorId, updatedAt: new Date() }).where(eq(invoiceTemplates.id, id)).returning();
    await audit(id, 'version_restored_to_draft', actorId, { sourceVersion: version.version });
    return updated;
  },

  async archive(id: string, actorId: string) {
    const [updated] = await db.update(invoiceTemplates).set({ status: 'archived', isDefault: false, archivedAt: new Date(), updatedBy: actorId, updatedAt: new Date() }).where(eq(invoiceTemplates.id, id)).returning();
    if (!updated) throw new NotFoundError('Invoice template not found.');
    await audit(id, 'archived', actorId);
    return updated;
  },

  preview: (config: InvoiceTemplateConfig, itemCount = 4) => {
    const sample = sampleInvoice();
    sample.items = Array.from({ length: Math.min(Math.max(itemCount, 1), 80) }, (_, index) => ({ ...sample.items[index % sample.items.length], productTitle: `Sample electronic product ${index + 1} with a descriptive product name` }));
    return renderInvoicePdf(config, sample);
  },

  async issueForOrder(orderId: string, userId?: string) {
    const [existing] = await db.select().from(issuedInvoices).where(eq(issuedInvoices.orderId, orderId)).limit(1);
    if (existing) return existing;
    const invoice = await ordersService.getInvoice(orderId, userId);
    if (!['paid', 'refunded'].includes(invoice.order.paymentStatus) || !invoice.order.invoiceNumber) throw new AppError('The invoice is issued only after payment is captured.', 409);
    const isPreVersionedInvoice = invoice.order.invoiceIssuedAt ? new Date(invoice.order.invoiceIssuedAt) < VERSIONED_INVOICE_CUTOFF : false;
    const [template] = isPreVersionedInvoice ? [] : await db.select().from(invoiceTemplates).where(and(eq(invoiceTemplates.documentType, 'tax_invoice'), eq(invoiceTemplates.isDefault, true), eq(invoiceTemplates.status, 'published'))).limit(1);
    const [version] = template?.activeVersionId ? await db.select().from(invoiceTemplateVersions).where(eq(invoiceTemplateVersions.id, template.activeVersionId)).limit(1) : [];
    const config = version?.config ?? defaultInvoiceConfig();
    const renderData = invoice as unknown as InvoiceRenderData;
    const rendered = await renderInvoicePdf(config, renderData);
    const values = {
      orderId, templateVersionId: version?.id, invoiceNumber: invoice.order.invoiceNumber,
      orderSnapshot: invoice.order, sellerSnapshot: invoice.merchant, buyerSnapshot: { shippingAddress: invoice.order.shippingAddress, billingAddress: invoice.order.billingAddress, buyerBusinessSnapshot: invoice.order.buyerBusinessSnapshot },
      templateSnapshot: config, pdfSha256: createHash('sha256').update(rendered.buffer).digest('hex'), pdfBytes: rendered.buffer,
      pageCount: rendered.pageCount, isLegacy: isPreVersionedInvoice || !version,
    };
    const [created] = await db.insert(issuedInvoices).values(values).onConflictDoNothing({ target: issuedInvoices.orderId }).returning();
    if (created) return created;
    const [winner] = await db.select().from(issuedInvoices).where(eq(issuedInvoices.orderId, orderId)).limit(1);
    return winner;
  },
};
