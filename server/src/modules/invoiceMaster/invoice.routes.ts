import { Router } from 'express';
import { z } from 'zod';
import { adminOnly, authenticate } from '../../core/middlewares/authGuard.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { sendCreated, sendSuccess } from '../../core/utils/responseHandler.js';
import { createInvoiceTemplateSchema, invoiceTemplateConfigSchema, publishInvoiceTemplateSchema, updateInvoiceDraftSchema } from './invoice.schema.js';
import { defaultInvoiceConfig, invoiceMasterService } from './invoice.service.js';

const router = Router();

router.get('/templates', ...adminOnly, asyncHandler(async (_req, res) => sendSuccess(res, await invoiceMasterService.list())));
router.get('/templates/:id', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await invoiceMasterService.detail(String(req.params.id)))));
router.post('/templates', ...adminOnly, asyncHandler(async (req, res) => sendCreated(res, await invoiceMasterService.create(createInvoiceTemplateSchema.parse(req.body), req.user!.id))));
router.post('/templates/:id/duplicate', ...adminOnly, asyncHandler(async (req, res) => sendCreated(res, await invoiceMasterService.duplicate(String(req.params.id), req.user!.id))));
router.put('/templates/:id/draft', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await invoiceMasterService.updateDraft(String(req.params.id), updateInvoiceDraftSchema.parse(req.body), req.user!.id), 'Invoice draft saved.')));
router.post('/templates/:id/publish', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await invoiceMasterService.publish(String(req.params.id), req.user!.id, publishInvoiceTemplateSchema.parse(req.body)), 'Immutable invoice version published.')));
router.post('/templates/:id/restore/:versionId', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await invoiceMasterService.restore(String(req.params.id), String(req.params.versionId), req.user!.id), 'Version copied into draft.')));
router.patch('/templates/:id/archive', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await invoiceMasterService.archive(String(req.params.id), req.user!.id))));
router.post('/preview', ...adminOnly, asyncHandler(async (req, res) => {
  const input = z.object({ config: invoiceTemplateConfigSchema.optional(), itemCount: z.number().int().min(1).max(80).default(4) }).parse(req.body);
  const rendered = await invoiceMasterService.preview((input.config ?? defaultInvoiceConfig()) as never, input.itemCount);
  res.type('application/pdf').setHeader('Content-Disposition', 'inline; filename="invoice-preview.pdf"');
  res.setHeader('X-Invoice-Pages', String(rendered.pageCount)); res.send(rendered.buffer);
}));
router.get('/orders/:orderId/pdf', authenticate, asyncHandler(async (req, res) => {
  const isAdmin = req.user!.role === 'admin' || req.user!.role === 'superadmin';
  const invoice = await invoiceMasterService.issueForOrder(String(req.params.orderId), isAdmin ? undefined : req.user!.id);
  res.type('application/pdf').setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  res.setHeader('X-Invoice-Legacy', String(invoice.isLegacy)); res.send(invoice.pdfBytes);
}));

export default router;
