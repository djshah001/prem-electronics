import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { CartItem } from '../types';

// Cart items persisted to localStorage
export const cartItemsAtom = atomWithStorage<CartItem[]>('prem_cart', []);

// Cart drawer open state
export const cartDrawerOpenAtom = atom(false);

// Derived: total item count
export const cartCountAtom = atom((get) =>
  get(cartItemsAtom).reduce((sum, item) => sum + item.quantity, 0)
);

// Derived: cart subtotal (client-side, pre-validation)
export const cartSubtotalAtom = atom((get) =>
  get(cartItemsAtom).reduce((sum, item) => {
    const price = parseFloat(item.salePrice ?? item.price);
    return sum + price * item.quantity;
  }, 0)
);
