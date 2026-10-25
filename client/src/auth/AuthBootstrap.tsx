import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { api } from '../api/axiosClient';
import { authReadyAtom, userAtom } from '../store/userAtom';
import type { User } from '../types';

export function AuthBootstrap() {
  const setUser = useSetAtom(userAtom);
  const setReady = useSetAtom(authReadyAtom);

  useEffect(() => {
    let active = true;
    api.get<User>('/auth/me')
      .then((response) => { if (active) setUser(response.data); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [setReady, setUser]);

  return null;
}
