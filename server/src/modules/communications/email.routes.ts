import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { adminOnly } from '../../core/middlewares/authGuard.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { sendCreated, sendSuccess } from '../../core/utils/responseHandler.js';
import { createEmailTemplateSchema, previewEmailSchema, publishEmailTemplateSchema, testEmailSchema, updateEmailDraftSchema } from './email.schema.js';
import { emailMasterService } from './email.service.js';
import { EMAIL_EVENT_CATALOG } from './emailCatalog.js';

const router = Router();
const previewLimiter = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false });
const testLimiter = rateLimit({ windowMs: 60 * 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

router.get('/templates', ...adminOnly, asyncHandler(async (_req, res) => sendSuccess(res, await emailMasterService.list())));
router.post('/bootstrap', ...adminOnly, asyncHandler(async (_req, res) => { for (const key of Object.keys(EMAIL_EVENT_CATALOG)) await emailMasterService.ensureSystemTemplate(key as keyof typeof EMAIL_EVENT_CATALOG); sendSuccess(res, await emailMasterService.list(), 'Default event templates are ready.'); }));
router.get('/templates/:id', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await emailMasterService.detail(String(req.params.id)))));
router.post('/templates', ...adminOnly, asyncHandler(async (req, res) => sendCreated(res, await emailMasterService.create(createEmailTemplateSchema.parse(req.body) as never, req.user!.id))));
router.put('/templates/:id/draft', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await emailMasterService.updateDraft(String(req.params.id), updateEmailDraftSchema.parse(req.body) as never, req.user!.id), 'Email draft saved.')));
router.post('/templates/:id/publish', ...adminOnly, asyncHandler(async (req, res) => { const input = publishEmailTemplateSchema.parse(req.body); sendSuccess(res, await emailMasterService.publish(String(req.params.id), req.user!.id, input.changeNote), 'Immutable email version published.'); }));
router.post('/templates/:id/restore/:versionId', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await emailMasterService.restore(String(req.params.id), String(req.params.versionId), req.user!.id), 'Version copied into draft.')));
router.patch('/templates/:id/archive', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await emailMasterService.archive(String(req.params.id), req.user!.id))));
router.post('/preview', previewLimiter, ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, emailMasterService.preview(previewEmailSchema.parse(req.body) as never))));
router.post('/templates/:id/test-send', testLimiter, ...adminOnly, asyncHandler(async (req, res) => { const input = testEmailSchema.parse(req.body); sendSuccess(res, await emailMasterService.testSend(String(req.params.id), input.recipient, input.variables, req.user!.email), 'Test email processed. Inspect its truthful delivery status.'); }));
router.get('/logs', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await emailMasterService.logs(Number(req.query.limit) || 100))));

export default router;
