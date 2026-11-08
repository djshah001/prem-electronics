import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { api } from '../api/axiosClient';
import { authReadyAtom, userAtom } from '../store/userAtom';
import type { User } from '../types';

export function AuthBootstrap() {
  const setUser = useSetAtom(userAtom);
  const setReady = useSetAtom(authReadyAtom);

  useEffect(() => {
    // If no user session is present in localStorage, visitor is an unauthenticated guest.
    // Skip /auth/me network call to avoid unnecessary 401s in console and faster initial load.
    const storedUser = localStorage.getItem('prem_user');
    if (!storedUser || storedUser === 'null') {
      setUser(null);
      setReady(true);
      return;
    }

    let active = true;
    api.get<User>('/auth/me')
      .then((response) => {
        if (active) setUser(response.data);
      })
      .catch(() => {
        if (active) {
          localStorage.removeItem('prem_user');
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [setReady, setUser]);

  return null;
}
