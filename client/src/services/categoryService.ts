import { api } from '../api/axiosClient';
import type { Category, ApiResponse } from '../types';

export const categoryService = {
  /**
   * Fetches the hierarchical category tree (categories with nested subcategories).
   * Returns ApiResponse<Category[]> consistent with all other API queries in the app.
   */
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return api.get<Category[]>('/categories');
  },

  /**
   * Fetches a single category by its slug.
   */
  async getCategoryBySlug(slug: string): Promise<ApiResponse<Category>> {
    return api.get<Category>(`/categories/${slug}`);
  },
};
