import { Router } from 'express';
import { authenticate } from '../../core/middlewares/authGuard.js';
import { asyncHandler } from '../../core/middlewares/asyncHandler.js';
import { businessesController } from './businesses.controller.js';

const router = Router();
router.use(authenticate);
router.post('/gstin-lookup', asyncHandler(businessesController.lookup));
router.get('/', asyncHandler(businessesController.list));
router.post('/', asyncHandler(businessesController.create));
router.patch('/:id', asyncHandler(businessesController.update));
router.delete('/:id', asyncHandler(businessesController.archive));
export default router;
