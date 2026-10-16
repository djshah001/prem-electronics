import { Request, Response } from 'express';
import { z } from 'zod';
import { sendCreated, sendSuccess } from '../../core/utils/responseHandler.js';
import { bannersService } from './banners.service.js';
import {
  bannerAdminQuerySchema,
  bannerIdSchema,
  bannerPlacementSchema,
  bannerSettingsSchema,
  createBannerSchema,
  reorderBannersSchema,
  updateBannerSchema,
} from './banners.schema.js';

const publicQuerySchema = z.object({ placement: bannerPlacementSchema.default('home_hero') }).strict();
const archiveQuerySchema = z.object({ expectedVersion: z.coerce.number().int().positive() }).strict();

export const bannersController = {
  async publicList(req: Request, res: Response) {
    publicQuerySchema.parse(req.query);
    const result = await bannersService.publicList();
    const seconds = Math.max(0, Math.min(30, Math.floor((new Date(result.freshUntil).getTime() - Date.now()) / 1000)));
    res.setHeader('Cache-Control', seconds > 0 ? `public, max-age=${seconds}, stale-while-revalidate=15` : 'public, max-age=0, must-revalidate');
    sendSuccess(res, result, 'Banners fetched.');
  },

  async adminList(req: Request, res: Response) {
    const query = bannerAdminQuerySchema.parse(req.query);
    const result = await bannersService.adminList(query);
    sendSuccess(res, result.data, 'Admin banners fetched.', 200, result.meta);
  },

  async orderList(req: Request, res: Response) {
    const placement = bannerPlacementSchema.parse(req.query.placement ?? 'home_hero');
    sendSuccess(res, await bannersService.orderList(placement), 'Banner ordering fetched.');
  },

  async detail(req: Request, res: Response) {
    sendSuccess(res, await bannersService.detail(bannerIdSchema.parse(req.params.id)), 'Banner fetched.');
  },

  async create(req: Request, res: Response) {
    const input = createBannerSchema.parse(req.body);
    sendCreated(res, await bannersService.create(input, req.user!.id, req.user!.role), 'Banner created.');
  },

  async update(req: Request, res: Response) {
    const id = bannerIdSchema.parse(req.params.id);
    const input = updateBannerSchema.parse(req.body);
    sendSuccess(res, await bannersService.update(id, input, req.user!.id, req.user!.role), 'Banner updated.');
  },

  async reorder(req: Request, res: Response) {
    const input = reorderBannersSchema.parse(req.body);
    sendSuccess(res, await bannersService.reorder(input.placement, input.items, req.user!.id), 'Banner order saved.');
  },

  async archive(req: Request, res: Response) {
    const id = bannerIdSchema.parse(req.params.id);
    const { expectedVersion } = archiveQuerySchema.parse(req.query);
    sendSuccess(res, await bannersService.archive(id, expectedVersion, req.user!.id), 'Banner archived.');
  },

  async settings(_req: Request, res: Response) {
    sendSuccess(res, await bannersService.getSettings(), 'Hero settings fetched.');
  },

  async updateSettings(req: Request, res: Response) {
    const input = bannerSettingsSchema.parse(req.body);
    sendSuccess(res, await bannersService.updateSettings(input, req.user!.id), 'Hero settings updated.');
  },
};
