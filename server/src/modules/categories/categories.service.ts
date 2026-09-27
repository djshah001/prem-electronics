import { categoriesRepository } from './categories.repository';
import { NotFoundError, ConflictError } from '../../core/errors/appError';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.schema';
import type { Category } from '../../infrastructure/database/schema/index';

interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

const buildTree = (
  categories: Category[],
  parentId: string | null = null
): CategoryWithChildren[] => {
  return categories
    .filter((c) => (parentId === null ? !c.parentId : c.parentId === parentId))
    .map((c) => ({
      ...c,
      children: buildTree(categories, c.id),
    }));
};

export const categoriesService = {
  async getTree() {
    const all = await categoriesRepository.findAll();
    return buildTree(all);
  },

  async getBySlug(slug: string) {
    const category = await categoriesRepository.findBySlug(slug);
    if (!category) throw new NotFoundError('Category not found.');
    return category;
  },

  async create(input: CreateCategoryInput) {
    const existing = await categoriesRepository.findBySlug(input.slug);
    if (existing) throw new ConflictError('A category with this slug already exists.');
    return categoriesRepository.create(input);
  },

  async update(id: string, input: UpdateCategoryInput) {
    const existing = await categoriesRepository.findById(id);
    if (!existing) throw new NotFoundError('Category not found.');

    if (input.slug && input.slug !== existing.slug) {
      const slugConflict = await categoriesRepository.findBySlug(input.slug);
      if (slugConflict) throw new ConflictError('A category with this slug already exists.');
    }

    return categoriesRepository.update(id, input);
  },

  async delete(id: string) {
    const existing = await categoriesRepository.findById(id);
    if (!existing) throw new NotFoundError('Category not found.');
    await categoriesRepository.delete(id);
  },
};
