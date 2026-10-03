import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { CartItem } from '../types';

// Cart items persisted to localStorage
export const cartItemsAtom = atomWithStorage<CartItem[]>('prem_cart', [], undefined, {
  getOnInit: true,
});

// Cart drawer open state
export const cartDrawerOpenAtom = atom(false);

// Derived: total item count
export const cartCountAtom = atom((get) => {
  const items = get(cartItemsAtom) as CartItem[]; // Explicit cast
  return items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
});

// Derived: cart subtotal (client-side, pre-validation)
export const cartSubtotalAtom = atom((get) => {
  const items = get(cartItemsAtom) as CartItem[]; // Explicit cast
  return items.reduce((sum: number, item: CartItem) => {
    const price = parseFloat(item.salePrice ?? item.price);
    return sum + price * item.quantity;
  }, 0);
});
