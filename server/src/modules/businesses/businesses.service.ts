import { env } from '../../config/env.js';
import { AppError, ConflictError, NotFoundError } from '../../core/errors/appError.js';
import { getGstProvider } from '../../infrastructure/gst/gstProvider.js';
import { businessesRepository } from './businesses.repository.js';
import type { CreateBusinessInput, UpdateBusinessInput } from './businesses.schema.js';

export const businessesService = {
  async lookup(userId: string, gstin: string) {
    const cached = await businessesRepository.findFreshVerification(userId, gstin);
    if (cached) return { ...cached, cached: true };
    const provider = getGstProvider();
    const taxpayer = await provider.lookup(gstin);
    const checkedAt = new Date();
    const expiresAt = new Date(checkedAt.getTime() + env.GST_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
    const verification = await businessesRepository.createVerification({
      userId, gstin: taxpayer.gstin, provider: provider.name, registrationStatus: taxpayer.registrationStatus,
      legalName: taxpayer.legalName, tradeName: taxpayer.tradeName, taxpayerType: taxpayer.taxpayerType,
      stateCode: taxpayer.stateCode, stateName: taxpayer.stateName, principalAddress: taxpayer.principalAddress,
      additionalAddresses: taxpayer.additionalAddresses, providerPayload: { registrationStatus: taxpayer.registrationStatus }, checkedAt, expiresAt,
    });
    return { ...verification, cached: false };
  },

  list(userId: string) { return businessesRepository.list(userId); },

  async create(userId: string, input: CreateBusinessInput) {
    const result = await businessesRepository.createFromVerification(userId, input.verificationId, {
      nickname: input.nickname, billingAddress: input.billingAddress, contactPerson: input.contactPerson,
      contactPhone: input.contactPhone, contactEmail: input.contactEmail, isDefault: input.isDefault,
    });
    if (result.kind === 'missing') throw new NotFoundError('GST verification was not found for this account.');
    if (result.kind === 'expired') throw new AppError('GST verification has expired. Fetch company details again.', 409);
    if (result.kind === 'inactive') throw new AppError('Only an active GST registration can be saved for company checkout.', 409);
    return result.profile;
  },

  async update(userId: string, id: string, input: UpdateBusinessInput) {
    const { version, ...data } = input;
    const result = await businessesRepository.update(id, userId, version, data);
    if (result.kind === 'missing') throw new NotFoundError('Business profile not found.');
    if (result.kind === 'conflict') throw new ConflictError('This business profile changed in another session. Refresh and retry.');
    return result.profile;
  },

  async archive(userId: string, id: string) {
    if (!await businessesRepository.archive(id, userId)) throw new NotFoundError('Business profile not found.');
  },
};
