import { useQuery } from '@tanstack/react-query';
import { api } from '../api/axiosClient';

export interface NavbarItem {
  id: string;
  label: string;
  type: 'all_categories' | 'category' | 'custom_link';
  categoryId: string | null;
  href: string | null;
  iconName: string | null;
  sortOrder: number;
  isVisible: boolean;
}

export const NAVBAR_CONFIG_QUERY_KEY = ['navbar-config'] as const;

export const useNavbarConfig = () => {
  return useQuery({
    queryKey: NAVBAR_CONFIG_QUERY_KEY,
    queryFn: () => api.get<NavbarItem[]>('/navbar'),
    select: (res) => (Array.isArray(res.data) ? res.data : []),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
