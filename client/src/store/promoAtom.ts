import { atom } from 'jotai';

export const hasSeenPromoAtom = atom<boolean>(
  typeof window !== 'undefined' ? localStorage.getItem('hasSeenPromo') === 'true' : true
);
