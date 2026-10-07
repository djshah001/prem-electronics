import { z } from 'zod';

const sectionKeys = ['seller', 'buyer', 'metadata', 'items', 'taxSummary', 'amountWords', 'bank', 'terms', 'signature'] as const;

export const invoiceTemplateConfigSchema = z.object({
  page: z.object({
    size: z.literal('A4').default('A4'),
    marginMm: z.number().min(5).max(25).default(10),
    repeatTableHeader: z.boolean().default(true),
    showPageNumbers: z.boolean().default(true),
  }),
  labels: z.record(z.string(), z.string().max(100)).default({}),
  sections: z.array(z.object({ key: z.enum(sectionKeys), visible: z.boolean(), order: z.number().int() }))
    .refine((sections) => new Set(sections.map((section) => section.key)).size === sections.length, 'Section keys must be unique.'),
  merchant: z.object({
    name: z.string().trim().min(1).max(160), gstin: z.string().max(15).optional(), pan: z.string().max(20).optional(),
    address: z.string().max(1000).optional(), state: z.string().max(100).optional(), stateCode: z.string().max(2).optional(),
    phone: z.string().max(30).optional(), email: z.string().email().optional(), bankDetails: z.string().max(1000).optional(),
    declaration: z.string().max(1000).optional(), signatureLabel: z.string().max(100).optional(),
  }),
  terms: z.string().max(2000).optional(),
});

export const createInvoiceTemplateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  documentType: z.enum(['tax_invoice', 'proforma_invoice', 'credit_note']).default('tax_invoice'),
  config: invoiceTemplateConfigSchema,
});

export const updateInvoiceDraftSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  config: invoiceTemplateConfigSchema,
  expectedRevision: z.number().int().positive(),
});

export const publishInvoiceTemplateSchema = z.object({ changeNote: z.string().max(500).optional(), makeDefault: z.boolean().default(false) });

