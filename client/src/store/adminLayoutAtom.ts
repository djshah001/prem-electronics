import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const adminSidebarCollapsedAtom = atomWithStorage('prem_admin_sidebar_collapsed', false, undefined, { getOnInit: true });
export const adminMobileNavOpenAtom = atom(false);
