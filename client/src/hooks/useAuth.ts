import { useAtom } from 'jotai';
import { userAtom } from '../store/userAtom';
import { api } from '../api/axiosClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { User, AuthResponse } from '../types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cartItemsAtom } from '../store/cartAtom';

export const useAuth = () => {
  const [user, setUser] = useAtom(userAtom);
  const [guestCart, setGuestCart] = useAtom(cartItemsAtom);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<AuthResponse>('/auth/login', data),
    onSuccess: async (res) => {
      setUser(res.data.user);
      if (guestCart.length > 0) {
        try {
          await api.post('/cart/merge', {
            items: guestCart.map(({ productId, quantity }) => ({ productId, quantity })),
          });
          setGuestCart([]);
          await queryClient.invalidateQueries({ queryKey: ['cart'] });
        } catch {
          toast.warning('Signed in, but your guest cart could not be merged. It remains saved on this device.');
        }
      }
      toast.success(`Welcome back, ${res.data.user.name}! 👋`);
      if (res.data.user.role === 'admin' || res.data.user.role === 'superadmin') {
        navigate('/admin');
      } else {
        navigate('/');
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
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      setUser(null);
      localStorage.removeItem('prem_user');
      queryClient.clear();
      toast.success('Logged out successfully.');
      navigate('/');
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
      setUser(res.data.user);
      if (guestCart.length > 0) {
        try {
          await api.post('/cart/merge', {
            items: guestCart.map(({ productId, quantity }) => ({ productId, quantity })),
          });
          setGuestCart([]);
          await queryClient.invalidateQueries({ queryKey: ['cart'] });
        } catch {
          toast.warning('Your account is verified, but the guest cart could not be merged yet.');
        }
      }
      toast.success('Email verified! Welcome to Prem Electronics ⚡');
      navigate('/');
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
