import { Request, Response } from 'express';
import { navbarMasterService } from './navbarMaster.service.js';
import {
  createNavbarItemSchema,
  updateNavbarItemSchema,
  reorderNavbarSchema,
} from './navbarMaster.schema.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../core/utils/responseHandler.js';

export const navbarMasterController = {
  /** GET /api/v1/navbar  — public */
  async getPublic(req: Request, res: Response) {
    const items = await navbarMasterService.getPublicNavbar();
    sendSuccess(res, items);
  },

  /** GET /api/v1/navbar/admin  — admin */
  async getAll(req: Request, res: Response) {
    const items = await navbarMasterService.getAllItems();
    sendSuccess(res, items);
  },

  /** POST /api/v1/navbar  — admin */
  async create(req: Request, res: Response) {
    const input = createNavbarItemSchema.parse(req.body);
    const item = await navbarMasterService.create(input);
    sendCreated(res, item, 'Navbar item created successfully.');
  },

  /** PUT /api/v1/navbar/:id  — admin */
  async update(req: Request, res: Response) {
    const input = updateNavbarItemSchema.parse(req.body);
    const item = await navbarMasterService.update(req.params.id as string, input);
    sendSuccess(res, item, 'Navbar item updated successfully.');
  },

  /** DELETE /api/v1/navbar/:id  — admin */
  async delete(req: Request, res: Response) {
    await navbarMasterService.delete(req.params.id as string);
    sendNoContent(res);
  },

  /** POST /api/v1/navbar/reorder  — admin */
  async reorder(req: Request, res: Response) {
    const input = reorderNavbarSchema.parse(req.body);
    const items = await navbarMasterService.reorder(input);
    sendSuccess(res, items, 'Navbar reordered successfully.');
  },
};
