import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { adminOnly, authenticate } from '../../core/middlewares/authGuard.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { sendCreated, sendSuccess } from '../../core/utils/responseHandler.js';
import { campaignService } from './campaign.service.js';

export const campaignRouter = Router();
campaignRouter.get('/', ...adminOnly, asyncHandler(async (_req, res) => sendSuccess(res, await campaignService.list())));
campaignRouter.get('/audience-preview', ...adminOnly, asyncHandler(async (_req, res) => sendSuccess(res, await campaignService.audiencePreview())));
campaignRouter.get('/:id', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.detail(String(req.params.id)))));
campaignRouter.post('/', ...adminOnly, asyncHandler(async (req, res) => { const input = z.object({ name: z.string().min(2).max(160), templateVersionId: z.string().uuid() }).parse(req.body); sendCreated(res, await campaignService.create(input.name, input.templateVersionId, req.user!.id)); }));
campaignRouter.post('/:id/snapshot', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.snapshot(String(req.params.id), req.user!.id))));
campaignRouter.post('/:id/schedule', ...adminOnly, asyncHandler(async (req, res) => { const input = z.object({ scheduledAt: z.coerce.date() }).parse(req.body); sendSuccess(res, await campaignService.schedule(String(req.params.id), input.scheduledAt, req.user!.id)); }));
campaignRouter.post('/:id/start', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.start(String(req.params.id), req.user!.id))));
campaignRouter.post('/:id/test', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.test(String(req.params.id), req.user!.email), 'Campaign test processed for the signed-in admin only.')));
campaignRouter.post('/:id/pause', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.pause(String(req.params.id), req.user!.id))));
campaignRouter.post('/:id/cancel', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.cancel(String(req.params.id), req.user!.id))));

export const marketingRouter = Router();
marketingRouter.get('/preference', authenticate, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.getPreference(req.user!.id, req.user!.email))));
marketingRouter.put('/preference', authenticate, asyncHandler(async (req, res) => { const { optedIn } = z.object({ optedIn: z.boolean() }).parse(req.body); sendSuccess(res, await campaignService.setPreference(req.user!.id, req.user!.email, optedIn), 'Marketing preference saved.'); }));

const unsubscribeLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30, standardHeaders: true, legacyHeaders: false });
export const unsubscribeRouter = Router();
unsubscribeRouter.get('/', unsubscribeLimiter, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.unsubscribeConfirmation(z.string().min(20).parse(req.query.token)), 'Confirm unsubscribe. No preference was changed.')));
unsubscribeRouter.post('/', unsubscribeLimiter, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.unsubscribe(z.object({ token: z.string().min(20) }).parse(req.body).token), 'You have been unsubscribed.')));
