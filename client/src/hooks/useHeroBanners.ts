import { useQuery } from '@tanstack/react-query';
import { api } from '../api/axiosClient';
import type { PublicBannerResponse } from '../types/banner';

export const heroBannerQueryKey = ['banners', 'home_hero'] as const;

export function useHeroBanners() {
  return useQuery({
    queryKey: heroBannerQueryKey,
    queryFn: () => api.get<PublicBannerResponse>('/banners', { placement: 'home_hero' }),
    staleTime: 5 * 60_000,
    refetchInterval: false,
    retry: 1,
    refetchOnWindowFocus: true,
  });
}
