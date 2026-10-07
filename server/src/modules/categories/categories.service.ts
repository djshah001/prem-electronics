import { categoriesRepository } from './categories.repository.js';
import { NotFoundError, ConflictError } from '../../core/errors/appError.js';
import { buildPaginationMeta } from '../../core/utils/responseHandler.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.schema.js';
import type { Category } from '../../infrastructure/database/schema/index.js';

interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
}

const validateParent = async (categoryId: string | null, parentId: string | null | undefined) => {
  if (!parentId) return;
  if (parentId === categoryId) throw new ConflictError('A category cannot be its own parent.');

  const parent = await categoriesRepository.findById(parentId);
  if (!parent || !parent.isActive) {
    throw new ConflictError('Parent category must exist and be active.');
  }

  if (!categoryId) return;
  const all = await categoriesRepository.findAllIncludingArchived();
  let cursor: Category | undefined = parent;
  const visited = new Set<string>();
  while (cursor?.parentId) {
    if (cursor.parentId === categoryId) {
      throw new ConflictError('Category hierarchy cannot contain a cycle.');
    }
    if (visited.has(cursor.parentId)) {
      throw new ConflictError('The selected parent belongs to an invalid category hierarchy.');
    }
    visited.add(cursor.parentId);
    cursor = all.find((category) => category.id === cursor!.parentId);
  }
};

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
    const category = await categoriesRepository.findBySlug(slug, true);
    if (!category) throw new NotFoundError('Category not found.');
    return category;
  },

  async create(input: CreateCategoryInput) {
    const existing = await categoriesRepository.findBySlug(input.slug);
    if (existing) throw new ConflictError('A category with this slug already exists.');
    await validateParent(null, input.parentId);
    return categoriesRepository.create(input);
  },

  async update(id: string, input: UpdateCategoryInput) {
    const existing = await categoriesRepository.findById(id);
    if (!existing) throw new NotFoundError('Category not found.');

    if (input.slug && input.slug !== existing.slug) {
      const slugConflict = await categoriesRepository.findBySlug(input.slug);
      if (slugConflict) throw new ConflictError('A category with this slug already exists.');
    }

    await validateParent(id, input.parentId);
    if (input.isActive === true && existing.parentId) {
      const parentId = input.parentId === undefined ? existing.parentId : input.parentId;
      await validateParent(id, parentId);
    }

    return categoriesRepository.update(id, input);
  },

  async delete(id: string) {
    const existing = await categoriesRepository.findById(id);
    if (!existing) throw new NotFoundError('Category not found.');
    const blockers = await categoriesRepository.getArchiveBlockers(id);
    if (blockers.activeProducts > 0 || blockers.activeChildren > 0) {
      throw new ConflictError('Deactivate or reassign active products and child categories before archiving this category.');
    }
    return categoriesRepository.archive(id);
  },

  async getCategoriesAdmin(query: { page: number; limit: number; search?: string; sortBy?: string; sortOrder?: string }) {
    const { data, total } = await categoriesRepository.findAllAdmin(query.page, query.limit, query.search, query.sortBy, query.sortOrder as 'asc' | 'desc');
    const meta = buildPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  },

  async bulkDelete(ids: string[]) {
    const results = await Promise.all(ids.map(async (id) => {
      const category = await categoriesRepository.findById(id);
      if (!category) return { id, archived: false, reason: 'Category not found.' };
      const blockers = await categoriesRepository.getArchiveBlockers(id);
      if (blockers.activeProducts > 0 || blockers.activeChildren > 0) {
        return { id, archived: false, reason: 'Category has active products or child categories.' };
      }
      await categoriesRepository.archive(id);
      return { id, archived: true };
    }));
    return {
      archived: results.filter((result) => result.archived).length,
      results,
    };
  },
};
