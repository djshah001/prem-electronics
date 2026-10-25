import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { adminOnly, authenticate } from '../../core/middlewares/authGuard.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { sendCreated, sendSuccess } from '../../core/utils/responseHandler.js';
import { campaignService } from './campaign.service.js';
import { AppError } from '../../core/errors/appError.js';

const requireContactEmail = (email: string | null): string => {
  if (!email) throw new AppError('Add a contact email before using email preferences.', 409);
  return email;
};

export const campaignRouter = Router();
campaignRouter.get('/', ...adminOnly, asyncHandler(async (_req, res) => sendSuccess(res, await campaignService.list())));
campaignRouter.get('/audience-preview', ...adminOnly, asyncHandler(async (req, res) => { const channel = z.enum(['email', 'whatsapp']).default('email').parse(req.query.channel); sendSuccess(res, await campaignService.audiencePreview(channel)); }));
campaignRouter.get('/:id', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.detail(String(req.params.id)))));
campaignRouter.post('/', ...adminOnly, asyncHandler(async (req, res) => {
  const input = z.discriminatedUnion('channel', [
    z.object({ channel: z.literal('email'), name: z.string().trim().min(2).max(160), templateVersionId: z.string().uuid() }),
    z.object({ channel: z.literal('whatsapp'), name: z.string().trim().min(2).max(160), templateName: z.string().trim().min(1).max(160).regex(/^[a-z0-9_]+$/), templateLanguage: z.string().trim().min(2).max(20), bodyVariables: z.array(z.string().max(500)).max(20) }),
  ]).parse(req.body);
  sendCreated(res, await campaignService.create(input, req.user!.id));
}));
campaignRouter.post('/:id/snapshot', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.snapshot(String(req.params.id), req.user!.id))));
campaignRouter.post('/:id/schedule', ...adminOnly, asyncHandler(async (req, res) => { const input = z.object({ scheduledAt: z.coerce.date() }).parse(req.body); sendSuccess(res, await campaignService.schedule(String(req.params.id), input.scheduledAt, req.user!.id)); }));
campaignRouter.post('/:id/start', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.start(String(req.params.id), req.user!.id))));
campaignRouter.post('/:id/test', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.test(String(req.params.id), req.user!.id), 'Campaign test processed for the signed-in admin only.')));
campaignRouter.post('/:id/pause', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.pause(String(req.params.id), req.user!.id))));
campaignRouter.post('/:id/cancel', ...adminOnly, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.cancel(String(req.params.id), req.user!.id))));

export const marketingRouter = Router();
marketingRouter.get('/preference', authenticate, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.getPreference(req.user!.id, requireContactEmail(req.user!.email)))));
marketingRouter.put('/preference', authenticate, asyncHandler(async (req, res) => { const { optedIn } = z.object({ optedIn: z.boolean() }).parse(req.body); sendSuccess(res, await campaignService.setPreference(req.user!.id, requireContactEmail(req.user!.email), optedIn), 'Marketing preference saved.'); }));
marketingRouter.get('/mobile-preference', authenticate, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.getMobilePreference(req.user!.id))));
marketingRouter.put('/mobile-preference', authenticate, asyncHandler(async (req, res) => { const { whatsappOptedIn } = z.object({ whatsappOptedIn: z.boolean() }).parse(req.body); sendSuccess(res, await campaignService.setMobilePreference(req.user!.id, whatsappOptedIn), 'WhatsApp preference saved.'); }));

const unsubscribeLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30, standardHeaders: true, legacyHeaders: false });
export const unsubscribeRouter = Router();
unsubscribeRouter.get('/', unsubscribeLimiter, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.unsubscribeConfirmation(z.string().min(20).parse(req.query.token)), 'Confirm unsubscribe. No preference was changed.')));
unsubscribeRouter.post('/', unsubscribeLimiter, asyncHandler(async (req, res) => sendSuccess(res, await campaignService.unsubscribe(z.object({ token: z.string().min(20) }).parse(req.body).token), 'You have been unsubscribed.')));
