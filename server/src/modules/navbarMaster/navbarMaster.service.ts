import { navbarRepository } from './navbarMaster.repository.js';
import { NotFoundError, AppError } from '../../core/errors/appError.js';
import type {
  CreateNavbarItemInput,
  UpdateNavbarItemInput,
  ReorderNavbarInput,
} from './navbarMaster.schema.js';

export const navbarMasterService = {
  /** Public: only visible items */
  async getPublicNavbar() {
    return navbarRepository.findVisible();
  },

  /** Admin: all items (visible + hidden) */
  async getAllItems() {
    return navbarRepository.findAll();
  },

  async create(input: CreateNavbarItemInput) {
    const existing = await navbarRepository.findAll();
    if (existing.length >= 7) {
      throw new AppError('Maximum limit reached: You cannot add more than 7 categories or links to the navbar.', 400);
    }
    return navbarRepository.create(input as any);
  },

  async update(id: string, input: UpdateNavbarItemInput) {
    const existing = await navbarRepository.findById(id);
    if (!existing) throw new NotFoundError('Navbar item not found.');
    const updated = await navbarRepository.update(id, input as any);
    return updated;
  },

  async delete(id: string) {
    const existing = await navbarRepository.findById(id);
    if (!existing) throw new NotFoundError('Navbar item not found.');
    await navbarRepository.delete(id);
  },

  async reorder(input: ReorderNavbarInput) {
    await navbarRepository.reorder(input.items);
    return navbarRepository.findAll();
  },
};
