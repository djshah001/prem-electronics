import { Router } from 'express';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { adminOnly } from '../../core/middlewares/authGuard.js';
import { sendSuccess } from '../../core/utils/responseHandler.js';
import { notificationListSchema } from './notifications.schema.js';
import { notificationsService } from './notifications.service.js';

const router = Router();
router.use(...adminOnly);

router.get('/', asyncHandler(async (req, res) => {
  const result = await notificationsService.list(req.user!.id, notificationListSchema.parse(req.query));
  sendSuccess(res, result.data, 'Notifications retrieved.', 200, result.meta);
}));
router.get('/unread-count', asyncHandler(async (req, res) => sendSuccess(res, await notificationsService.unreadCount(req.user!.id))));
router.patch('/:id/read', asyncHandler(async (req, res) => sendSuccess(res, await notificationsService.setRead(req.user!.id, String(req.params.id), true))));
router.patch('/:id/unread', asyncHandler(async (req, res) => sendSuccess(res, await notificationsService.setRead(req.user!.id, String(req.params.id), false))));
router.post('/read-all', asyncHandler(async (req, res) => sendSuccess(res, await notificationsService.readAll(req.user!.id), 'All current notifications marked as read.')));

export default router;
