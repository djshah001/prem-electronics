import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { userAtom } from '../store/userAtom';
import { api } from '../api/axiosClient';
import type { WishlistItem } from '../types';
import { toast } from 'sonner';

export const useWishlist = () => {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get<WishlistItem[]>('/wishlists'),
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const items = user && Array.isArray(data?.data) ? data.data : [];
  const wishlistCount = items.length;

  const isWishlisted = (productId: string) => {
    return items.some(
      (item) => item.productId === productId || item.product?.id === productId || (item as any).id === productId
    );
  };

  const removeMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlists/${productId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Removed from wishlist');
    },
    onError: () => toast.error('Failed to remove item from wishlist.'),
  });

  const toggleMutation = useMutation({
    mutationFn: async (productId: string) => {
      const exists = isWishlisted(productId);
      if (exists) {
        await api.delete(`/wishlists/${productId}`);
        return { action: 'removed' as const, productId };
      } else {
        await api.post(`/wishlists/${productId}`, {});
        return { action: 'added' as const, productId };
      }
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success(result.action === 'removed' ? 'Removed from wishlist' : 'Saved to wishlist');
    },
    onError: () => toast.error('Failed to update wishlist'),
  });

  return {
    items,
    wishlistCount,
    isLoading,
    isError,
    isWishlisted,
    removeItem: removeMutation.mutate,
    isRemoving: removeMutation.isPending,
    toggleItem: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
  };
};
