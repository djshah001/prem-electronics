import { Request, Response } from 'express';
import { usersService } from './users.service.js';
import {
  updateProfileSchema,
  createAddressSchema,
  updateAddressSchema,
} from './users.schema.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../core/utils/responseHandler.js';

export const usersController = {
  async getProfile(req: Request, res: Response) {
    const user = await usersService.getProfile(req.user!.id);
    sendSuccess(res, user);
  },

  async updateProfile(req: Request, res: Response) {
    const input = updateProfileSchema.parse(req.body);
    const user = await usersService.updateProfile(req.user!.id, input);
    sendSuccess(res, user, 'Profile updated successfully.');
  },

  async getAddresses(req: Request, res: Response) {
    const addresses = await usersService.getAddresses(req.user!.id);
    sendSuccess(res, addresses);
  },

  async createAddress(req: Request, res: Response) {
    const input = createAddressSchema.parse(req.body);
    const address = await usersService.createAddress(req.user!.id, input);
    sendCreated(res, address, 'Address added successfully.');
  },

  async updateAddress(req: Request, res: Response) {
    const input = updateAddressSchema.parse(req.body);
    const address = await usersService.updateAddress(
      req.user!.id,
      (req.params.id as string),
      input
    );
    sendSuccess(res, address, 'Address updated successfully.');
  },

  async deleteAddress(req: Request, res: Response) {
    await usersService.deleteAddress(req.user!.id, (req.params.id as string));
    sendNoContent(res);
  },

  async getUsersAdmin(req: Request, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as string | undefined;
    const { data, meta } = await usersService.getUsersAdmin({ page, limit, search, sortBy, sortOrder });
    sendSuccess(res, data, 'Admin users fetched.', 200, meta);
  },

  async bulkDelete(req: Request, res: Response) {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, message: 'Invalid IDs array' });
    }
    await usersService.bulkDelete(ids);
    sendSuccess(res, null, 'Users deleted successfully.');
  },
};
