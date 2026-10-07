import { useAtom } from 'jotai';
import { userAtom } from '../store/userAtom';
import { api } from '../api/axiosClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { User, AuthResponse } from '../types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cartItemsAtom } from '../store/cartAtom';
import {
  beginLogout,
  broadcastLogout,
  clearLocalAuthState,
  markSessionStarted,
} from '../auth/session';

export const useAuth = () => {
  const [user, setUser] = useAtom(userAtom);
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

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<AuthResponse>('/auth/login', data),
    onSuccess: async (res) => {
      markSessionStarted();
      setUser(res.data.user);
      if (guestCart.length > 0) {
        try {
          await mergeGuestCart();
        } catch {
          toast.warning('Signed in, but your guest cart could not be merged. It remains saved on this device.');
        }
      }
      toast.success(`Welcome back, ${res.data.user.name}! 👋`);
      if (res.data.user.role === 'admin' || res.data.user.role === 'superadmin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Login failed. Please try again.');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      api.post<User>('/auth/register', data),
    onSuccess: (_, variables) => {
      toast.success('Account created! Please check your email for the OTP.');
      navigate(`/verify-otp?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Registration failed.');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      beginLogout();
      await queryClient.cancelQueries();
      try {
        await api.post('/auth/logout');
        return { serverRevoked: true };
      } catch (error) {
        return { serverRevoked: false, error };
      } finally {
        clearLocalAuthState();
        setUser(null);
        queryClient.clear();
        broadcastLogout();
        navigate('/login', { replace: true });
      }
    },
    onSuccess: ({ serverRevoked }) => {
      if (serverRevoked) {
        toast.success('Logged out successfully.');
      } else {
        toast.error('Local session cleared, but the server could not confirm logout. Please retry when online.', {
          action: {
            label: 'Retry',
            onClick: () => logoutMutation.mutate(),
          },
        });
      }
    },
    onSettled: () => {
      setUser(null);
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (data: { email: string }) => api.post('/auth/forgot-password', data),
    onSuccess: () => {
      toast.success('Password reset link sent! Check your email.');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to send reset email.');
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: (data: { email: string; otp: string }) =>
      api.post<AuthResponse>('/auth/verify-otp', data),
    onSuccess: async (res) => {
      markSessionStarted();
      setUser(res.data.user);
      if (guestCart.length > 0) {
        try {
          await mergeGuestCart();
        } catch {
          toast.warning('Your account is verified, but the guest cart could not be merged yet.');
        }
      }
      toast.success('Email verified! Welcome to Prem Electronics ⚡');
      const pendingGstin = sessionStorage.getItem('pending_business_gstin');
      if (pendingGstin) {
        sessionStorage.removeItem('pending_business_gstin');
        navigate(`/account/businesses?setup=1&gstin=${encodeURIComponent(pendingGstin)}`);
      } else {
        navigate('/');
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'OTP verification failed.');
    },
  });

  return {
    user,
    isAuthenticated: user !== null,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
    forgotPassword: forgotPasswordMutation,
    verifyOTP: verifyOTPMutation,
  };
};
