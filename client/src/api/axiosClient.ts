import axios from 'axios';
import type { ApiResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly cookies
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Attach JWT from localStorage ─────────────────────
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('prem_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Extract data, handle 401 globally ───────────────
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('prem_token');
      localStorage.removeItem('prem_user');
      // Only redirect if not already on auth pages
      const publicPaths = ['/login', '/register', '/forgot-password', '/verify-otp'];
      if (!publicPaths.some((p) => window.location.pathname.startsWith(p))) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

// ─── API helper with typed response ──────────────────────────────────────────
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    axiosClient.get<ApiResponse<T>>(url, { params }).then((r) => r.data),

  post: <T>(url: string, data?: unknown) =>
    axiosClient.post<ApiResponse<T>>(url, data).then((r) => r.data),

  put: <T>(url: string, data?: unknown) =>
    axiosClient.put<ApiResponse<T>>(url, data).then((r) => r.data),

  delete: <T>(url: string) =>
    axiosClient.delete<ApiResponse<T>>(url).then((r) => r.data),

  patch: <T>(url: string, data?: unknown) =>
    axiosClient.patch<ApiResponse<T>>(url, data).then((r) => r.data),

  postForm: <T>(url: string, formData: FormData) =>
    axiosClient.post<ApiResponse<T>>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
};

export default axiosClient;
