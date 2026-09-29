import { usersRepository } from './users.repository';
import { NotFoundError } from '../../core/errors/appError';
import { buildPaginationMeta } from '../../core/utils/responseHandler';
import type { UpdateProfileInput, CreateAddressInput, UpdateAddressInput } from './users.schema';

const sanitizeUser = (user: { passwordHash?: string; otpToken?: string | null; otpExpiry?: Date | null; resetToken?: string | null; resetTokenExpiry?: Date | null; [key: string]: unknown }) => {
  const { passwordHash, otpToken, otpExpiry, resetToken, resetTokenExpiry, ...safe } = user;
  return safe;
};

export const usersService = {
  async getProfile(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found.');
    return sanitizeUser(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await usersRepository.updateProfile(userId, input);
    return sanitizeUser(user);
  },

  async getAddresses(userId: string) {
    return usersRepository.getAddresses(userId);
  },

  async createAddress(userId: string, input: CreateAddressInput) {
    if (input.isDefault) {
      await usersRepository.clearDefaultAddresses(userId);
    }
    return usersRepository.createAddress({ ...input, userId });
  },

  async updateAddress(userId: string, addressId: string, input: UpdateAddressInput) {
    if (input.isDefault) {
      await usersRepository.clearDefaultAddresses(userId);
    }
    const address = await usersRepository.updateAddress(addressId, userId, input);
    if (!address) throw new NotFoundError('Address not found.');
    return address;
  },

  async deleteAddress(userId: string, addressId: string) {
    const existing = await usersRepository.getAddressById(addressId, userId);
    if (!existing) throw new NotFoundError('Address not found.');
    await usersRepository.deleteAddress(addressId, userId);
  },

  async getUsersAdmin(query: { page: number; limit: number; search?: string; sortBy?: string; sortOrder?: string }) {
    const { data, total } = await usersRepository.findAllAdmin(query.page, query.limit, query.search, query.sortBy, query.sortOrder as 'asc' | 'desc');
    const meta = buildPaginationMeta(query.page, query.limit, total);
    // Remove password hashes before returning
    const safeData = data.map(sanitizeUser);
    return { data: safeData, meta };
  },

  async bulkDelete(ids: string[]) {
    return usersRepository.bulkDelete(ids);
  },
};
