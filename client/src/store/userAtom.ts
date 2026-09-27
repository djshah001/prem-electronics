import { atomWithStorage } from 'jotai/utils';
import { atom } from 'jotai';
import type { User } from '../types';

export const userAtom = atomWithStorage<User | null>('prem_user', null, undefined, {
  getOnInit: true,
});
export const authTokenAtom = atomWithStorage<string | null>('prem_token', null, undefined, {
  getOnInit: true,
});
export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null);
export const isAdminAtom = atom((get) => {
  const user = get(userAtom) as User;
  return user?.role === 'admin' || user?.role === 'superadmin';
});
