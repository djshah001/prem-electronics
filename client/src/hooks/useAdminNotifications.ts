import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axiosClient';

export type AdminNotificationSeverity = 'info' | 'success' | 'warning' | 'error';
export type AdminNotification = {
  id: string;
  type: string;
  severity: AdminNotificationSeverity;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  destination?: string | null;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
  readAt?: string | null;
};

export type NotificationFilters = {
  page?: number;
  limit?: number;
  type?: string;
  severity?: AdminNotificationSeverity | '';
  readState?: 'all' | 'read' | 'unread';
};

const useDocumentVisible = () => {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
};

export const notificationKeys = { all: ['admin-notifications'] as const };

export const useAdminNotifications = (filters: NotificationFilters = {}) => {
  const visible = useDocumentVisible();
  const requestFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  );
  return useQuery({
    queryKey: [...notificationKeys.all, 'list', filters],
    queryFn: () => api.get<AdminNotification[]>('/admin/notifications', requestFilters),
    refetchInterval: visible ? 25_000 : false,
    refetchOnWindowFocus: true,
    retry: 2,
  });
};

export const useAdminUnreadCount = () => {
  const visible = useDocumentVisible();
  return useQuery({
    queryKey: [...notificationKeys.all, 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/admin/notifications/unread-count'),
    refetchInterval: visible ? 25_000 : false,
    refetchOnWindowFocus: true,
    retry: 2,
  });
};

export const useNotificationActions = () => {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: notificationKeys.all });
  const markRead = useMutation({ mutationFn: (id: string) => api.patch(`/admin/notifications/${id}/read`), onSuccess: refresh });
  const markUnread = useMutation({ mutationFn: (id: string) => api.patch(`/admin/notifications/${id}/unread`), onSuccess: refresh });
  const markAllRead = useMutation({ mutationFn: () => api.post('/admin/notifications/read-all'), onSuccess: refresh });
  return { markRead, markUnread, markAllRead };
};

export const relativeNotificationTime = (value: string) => {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const ranges: Array<[number, Intl.RelativeTimeFormatUnit]> = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.345, 'week'], [12, 'month']];
  let amount = seconds;
  for (const [limit, unit] of ranges) {
    if (Math.abs(amount) < limit) return formatter.format(Math.round(amount), unit);
    amount /= limit;
  }
  return formatter.format(Math.round(amount), 'year');
};
