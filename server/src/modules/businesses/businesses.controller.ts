import type { Request, Response } from 'express';
import { sendCreated, sendNoContent, sendSuccess } from '../../core/utils/responseHandler.js';
import { businessesService } from './businesses.service.js';
import { businessIdSchema, createBusinessSchema, gstLookupSchema, updateBusinessSchema } from './businesses.schema.js';

export const businessesController = {
  async lookup(req: Request, res: Response) {
    const { gstin } = gstLookupSchema.parse(req.body);
    sendSuccess(res, await businessesService.lookup(req.user!.id, gstin), 'GST registration fetched.');
  },
  async list(req: Request, res: Response) { sendSuccess(res, await businessesService.list(req.user!.id)); },
  async create(req: Request, res: Response) {
    sendCreated(res, await businessesService.create(req.user!.id, createBusinessSchema.parse(req.body)), 'Business profile saved.');
  },
  async update(req: Request, res: Response) {
    sendSuccess(res, await businessesService.update(req.user!.id, businessIdSchema.parse(req.params.id), updateBusinessSchema.parse(req.body)), 'Business profile updated.');
  },
  async archive(req: Request, res: Response) {
    await businessesService.archive(req.user!.id, businessIdSchema.parse(req.params.id));
    sendNoContent(res);
  },
};
