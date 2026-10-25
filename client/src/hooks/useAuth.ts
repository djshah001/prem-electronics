import { useAtom } from 'jotai';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../api/axiosClient';
import { beginLogout, broadcastLogout, clearLocalAuthState, markSessionStarted } from '../auth/session';
import { cartItemsAtom } from '../store/cartAtom';
import { authReadyAtom, userAtom } from '../store/userAtom';
import type { User } from '../types';

const safeReturnTo = (value?: string | null): string | undefined =>
  value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : undefined;

export const useAuth = () => {
  const [user, setUser] = useAtom(userAtom);
  const [, setAuthReady] = useAtom(authReadyAtom);
  const [guestCart, setGuestCart] = useAtom(cartItemsAtom);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mergeGuestCart = async () => {
    if (guestCart.length === 0) return;
    const tokenKey = 'prem_cart_merge_token';
    const token = localStorage.getItem(tokenKey) ?? crypto.randomUUID();
    localStorage.setItem(tokenKey, token);
    await api.post('/cart/merge', {
      idempotencyToken: token,
      items: guestCart.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
    });
    setGuestCart([]);
    localStorage.removeItem(tokenKey);
    await queryClient.invalidateQueries({ queryKey: ['cart'] });
  };

  const completeAuthentication = async (authenticatedUser: User, returnTo?: string | null) => {
    markSessionStarted();
    setUser(authenticatedUser);
    setAuthReady(true);
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    if (guestCart.length > 0 && authenticatedUser.role === 'customer') {
      try { await mergeGuestCart(); }
      catch { toast.warning('Signed in, but your guest cart remains saved on this device and can be merged later.'); }
    }
    const destination = safeReturnTo(returnTo)
      ?? (authenticatedUser.role === 'admin' || authenticatedUser.role === 'superadmin' ? '/admin/dashboard' : '/');
    navigate(destination, { replace: true });
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      beginLogout();
      await queryClient.cancelQueries();
      try { await api.post('/auth/logout'); return true; }
      catch { return false; }
      finally {
        clearLocalAuthState();
        setUser(null);
        setAuthReady(true);
        queryClient.clear();
        broadcastLogout();
        navigate('/login', { replace: true });
      }
    },
    onSuccess: (confirmed) => confirmed
      ? toast.success('Logged out successfully.')
      : toast.error('Local session cleared, but server logout could not be confirmed.'),
  });

  return {
    user,
    isAuthenticated: user !== null,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    completeAuthentication,
    logout: logoutMutation,
  };
};
