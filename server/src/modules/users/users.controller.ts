import { Request, Response } from 'express';
import { usersService } from './users.service';
import {
  updateProfileSchema,
  createAddressSchema,
  updateAddressSchema,
} from './users.schema';
import { sendSuccess, sendCreated, sendNoContent } from '../../core/utils/responseHandler';

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
};
