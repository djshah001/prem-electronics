import { useAtom, useSetAtom } from 'jotai';
import { cartItemsAtom, cartDrawerOpenAtom } from '../store/cartAtom';
import type { Product } from '../types';
import { toast } from 'sonner';

export const useCart = () => {
  const [cartItems, setCartItems] = useAtom(cartItemsAtom);
  const setCartOpen = useSetAtom(cartDrawerOpenAtom);

  const addToCart = (product: Product, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          image: product.images?.[0],
          price: product.price,
          salePrice: product.salePrice,
          quantity,
          slug: product.slug,
        },
      ];
    });
    toast.success(`${product.title} added to cart!`, {
      action: { label: 'View Cart', onClick: () => setCartOpen(true) },
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
    toast.info('Item removed from cart.');
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const isInCart = (productId: string) =>
    cartItems.some((i) => i.productId === productId);

  const itemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = cartItems.reduce((sum, i) => {
    const price = parseFloat(i.salePrice ?? i.price);
    return sum + price * i.quantity;
  }, 0);

  return {
    cartItems,
    itemCount,
    subtotal,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isInCart,
  };
};
