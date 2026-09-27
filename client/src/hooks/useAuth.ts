import { useAtom, useSetAtom } from 'jotai';
import { userAtom, authTokenAtom } from '../store/userAtom';
import { api } from '../api/axiosClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { User, AuthResponse } from '../types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [user, setUser] = useAtom(userAtom);
  const setToken = useSetAtom(authTokenAtom);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<AuthResponse>('/auth/login', data),
    onSuccess: (res) => {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('prem_token', res.data.token);
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
      setToken(null);
      localStorage.removeItem('prem_token');
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
    onSuccess: (res) => {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('prem_token', res.data.token);
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
