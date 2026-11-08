import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types';
import {
  clearLocalAuthState,
  getSessionGeneration,
  isLogoutInProgress,
} from '../auth/session';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };
let refreshPromise: Promise<void> | null = null;

const refreshSession = () => {
  const generation = getSessionGeneration();
  if (!refreshPromise) {
    refreshPromise = axios.post(`${BASE_URL}/auth/refresh`, undefined, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    }).then(() => {
      if (generation !== getSessionGeneration() || isLogoutInProgress()) {
        throw new Error('Session changed while refresh was in progress.');
      }
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryableConfig | undefined;
    const status = error.response?.status;
    const url = String(config?.url ?? '');
    const isAuthAction = ['/auth/me', '/auth/otp/', '/auth/admin/otp/', '/auth/onboarding', '/auth/refresh', '/auth/logout']
      .some((path) => url.includes(path));

    if (status === 401 && config && !config._retry && !isAuthAction && !isLogoutInProgress()) {
      config._retry = true;
      try {
        await refreshSession();
        return axiosClient(config);
      } catch {
        clearLocalAuthState();
        const isProtectedRoute = ['/account', '/checkout', '/wishlist', '/admin'].some(
          (path) => window.location.pathname.startsWith(path)
        );
        if (isProtectedRoute) {
          window.location.replace('/login?reason=expired');
        }
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);

export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    axiosClient.get<ApiResponse<T>>(url, { params }).then((response) => response.data),
  post: <T>(url: string, data?: unknown) =>
    axiosClient.post<ApiResponse<T>>(url, data).then((response) => response.data),
  put: <T>(url: string, data?: unknown) =>
    axiosClient.put<ApiResponse<T>>(url, data).then((response) => response.data),
  delete: <T>(url: string) =>
    axiosClient.delete<ApiResponse<T>>(url).then((response) => response.data),
  patch: <T>(url: string, data?: unknown) =>
    axiosClient.patch<ApiResponse<T>>(url, data).then((response) => response.data),
  postForm: <T>(url: string, formData: FormData) =>
    axiosClient.post<ApiResponse<T>>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((response) => response.data),
};

export default axiosClient;
