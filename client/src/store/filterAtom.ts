import { atom } from 'jotai';

export interface FilterState {
  search: string;
  categoryId: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  brand: string | null;
  inStock: boolean;
  sortBy: 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'popular';
}

export const defaultFilters: FilterState = {
  search: '',
  categoryId: null,
  minPrice: null,
  maxPrice: null,
  brand: null,
  inStock: false,
  sortBy: 'newest',
};

export const filterAtom = atom<FilterState>(defaultFilters);
export const appliedCouponAtom = atom<string | null>(null);
