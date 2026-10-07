import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartItemsAtom, cartDrawerOpenAtom } from '../store/cartAtom';
import { userAtom } from '../store/userAtom';
import { api } from '../api/axiosClient';
import type { ApiResponse, CartItem, Product } from '../types';
import { toast } from 'sonner';

type CartProduct = Pick<Product, 'id' | 'title' | 'images' | 'price' | 'salePrice' | 'stock' | 'isActive' | 'slug'>;

export const useCart = () => {
  const [guestItems, setGuestItems] = useAtom(cartItemsAtom);
  const user = useAtomValue(userAtom);
  const setCartOpen = useSetAtom(cartDrawerOpenAtom);
  const queryClient = useQueryClient();

  const { data: serverCartResponse } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get<CartItem[]>('/cart'),
    enabled: Boolean(user),
    staleTime: 15_000,
  });

  const updateCachedCart = (response: ApiResponse<CartItem[]>) => {
    queryClient.setQueryData(['cart'], response);
  };

  const addMutation = useMutation({
    mutationFn: ({ productId, variantId, quantity }: { productId: string; variantId?: string; quantity: number }) =>
      api.post<CartItem[]>('/cart/items', { productId, variantId, quantity }),
    onSuccess: updateCachedCart,
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not update your cart.'),
  });

  const quantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      api.patch<CartItem[]>(`/cart/items/${productId}`, { quantity }),
    onSuccess: updateCachedCart,
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not update the quantity.'),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => api.delete<CartItem[]>(`/cart/items/${productId}`),
    onSuccess: updateCachedCart,
    onError: (error: { message?: string }) => toast.error(error.message ?? 'Could not remove the item.'),
  });

  const clearMutation = useMutation({
    mutationFn: () => api.delete<void>('/cart'),
    onSuccess: () => queryClient.setQueryData(['cart'], { success: true, message: '', data: [] }),
  });

  const cartItems = user ? (serverCartResponse?.data ?? []) : guestItems;

  const addToCart = (
    product: CartProduct,
    quantity = 1,
    variant?: { id: string; price: string; salePrice?: string | null; stockQuantity: number; sku: string; optionCombinationKey?: string }
  ) => {
    const isAvailable = variant ? (variant.stockQuantity > 0) : (product.isActive && product.stock > 0);
    const availableStock = variant ? variant.stockQuantity : product.stock;

    if (!isAvailable) {
      toast.error('This product is not available.');
      return;
    }
    if (user) {
      addMutation.mutate({ productId: product.id, variantId: variant?.id, quantity });
    } else {
      setGuestItems((previous) => {
        const itemKey = variant?.id ?? product.id;
        const existing = previous.find((item) => (item.variantId ?? item.productId) === itemKey);
        if (existing) {
          return previous.map((item) => (item.variantId ?? item.productId) === itemKey
            ? { ...item, quantity: Math.min(item.quantity + quantity, availableStock) }
            : item);
        }
        return [...previous, {
          productId: product.id,
          variantId: variant?.id,
          title: product.title,
          image: product.images?.[0],
          price: variant ? variant.price : product.price,
          salePrice: variant ? (variant.salePrice ?? undefined) : product.salePrice,
          quantity: Math.min(quantity, availableStock),
          slug: product.slug,
          variantSnapshot: variant ? { sku: variant.sku, optionCombinationKey: variant.optionCombinationKey } : undefined,
        }];
      });
    }
    toast.success(`${product.title} added to cart!`, {
      action: { label: 'View Cart', onClick: () => setCartOpen(true) },
    });
  };

  const removeFromCart = (identifier: string) => {
    if (user) removeMutation.mutate(identifier);
    else setGuestItems((previous) => previous.filter((item) => (item.variantId ?? item.productId) !== identifier && item.productId !== identifier));
    toast.info('Item removed from cart.');
  };

  const updateQuantity = (identifier: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(identifier);
      return;
    }
    if (user) quantityMutation.mutate({ productId: identifier, quantity });
    else setGuestItems((previous) => previous.map((item) =>
      ((item.variantId ?? item.productId) === identifier || item.productId === identifier)
        ? { ...item, quantity }
        : item
    ));
  };

  const clearCart = () => {
    if (user) clearMutation.mutate();
    else setGuestItems([]);
  };

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.salePrice ?? item.price) * item.quantity, 0);

  return {
    cartItems,
    itemCount,
    subtotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInCart: (productId: string, variantId?: string) => {
      if (variantId) return cartItems.some((item) => item.variantId === variantId);
      return cartItems.some((item) => item.productId === productId);
    },
    isSyncing: addMutation.isPending || quantityMutation.isPending || removeMutation.isPending || clearMutation.isPending,
  };
};
