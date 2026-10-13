import { useQuery } from '@tanstack/react-query';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types';

export const CATEGORIES_QUERY_KEY = ['categories'] as const;

/**
 * Safely normalizes category response data into Category[].
 * Handles:
 * - Direct Category[] arrays
 * - ApiResponse<Category[]> objects { success: true, data: Category[] }
 * - Axios responses or unexpected null/undefined values
 */
export const normalizeCategoryList = (raw: unknown): Category[] => {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const inner = (raw as { data: unknown }).data;
    if (Array.isArray(inner)) {
      return inner;
    }
  }
  return [];
};

export const useCategories = () => {
  const query = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => categoryService.getCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000,
  });

  const categories = normalizeCategoryList(query.data);

  // Filter root categories that are active
  const rootCategories = Array.isArray(categories)
    ? categories.filter(
        (cat) => cat && cat.isActive !== false && (!cat.parentId || cat.parentId === null)
      )
    : [];

  return {
    ...query,
    categories,
    rootCategories,
  };
};

/**
 * Utility function to find a category or subcategory by slug in a nested category tree
 */
export const findCategoryBySlug = (
  categories: Category[] | unknown,
  slug: string
): Category | undefined => {
  const list = normalizeCategoryList(categories);
  for (const cat of list) {
    if (!cat) continue;
    if (cat.slug === slug) return cat;
    if (Array.isArray(cat.children) && cat.children.length > 0) {
      const found = findCategoryBySlug(cat.children, slug);
      if (found) return found;
    }
  }
  return undefined;
};

/**
 * Utility function to find a category or subcategory by ID in a nested category tree
 */
export const findCategoryById = (
  categories: Category[] | unknown,
  id: string
): Category | undefined => {
  const list = normalizeCategoryList(categories);
  for (const cat of list) {
    if (!cat) continue;
    if (cat.id === id) return cat;
    if (Array.isArray(cat.children) && cat.children.length > 0) {
      const found = findCategoryById(cat.children, id);
      if (found) return found;
    }
  }
  return undefined;
};
