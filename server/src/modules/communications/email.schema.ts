import { z } from 'zod';
import { EMAIL_EVENT_CATALOG } from './emailCatalog.js';
import { structuredDocumentSchema } from './contentDocument.js';

const eventKeys = Object.keys(EMAIL_EVENT_CATALOG) as [keyof typeof EMAIL_EVENT_CATALOG, ...(keyof typeof EMAIL_EVENT_CATALOG)[]];
export const emailEventKeySchema = z.enum(eventKeys);

export const createEmailTemplateSchema = z.object({
  eventKey: emailEventKeySchema, name: z.string().trim().min(2).max(140), category: z.enum(['auth', 'transactional', 'marketing']),
  subject: z.string().min(1).max(255), preheader: z.string().max(255).optional(), document: structuredDocumentSchema,
  requiredVariables: z.array(z.string().regex(/^[a-zA-Z0-9_.]+$/)).max(30),
});
export const updateEmailDraftSchema = createEmailTemplateSchema.omit({ eventKey: true, category: true }).partial({ name: true, preheader: true, requiredVariables: true }).extend({ expectedRevision: z.number().int().positive() });
export const publishEmailTemplateSchema = z.object({ changeNote: z.string().max(500).optional() });
export const previewEmailSchema = z.object({ subject: z.string().max(255), preheader: z.string().max(255).optional(), document: structuredDocumentSchema, variables: z.record(z.string(), z.unknown()).default({}) });
export const testEmailSchema = z.object({ recipient: z.string().email(), variables: z.record(z.string(), z.unknown()).default({}) });

