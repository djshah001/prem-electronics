import { z } from 'zod';

const single = (value: unknown) => Array.isArray(value) ? value[0] : value;
const optionalFilter = (value: unknown) => {
  const normalized = single(value);
  return normalized === '' || normalized === null ? undefined : normalized;
};

export const notificationListSchema = z.object({
  page: z.preprocess(single, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(single, z.coerce.number().int().min(1).max(50).default(10)),
  type: z.preprocess(optionalFilter, z.string().trim().min(1).max(60).optional()),
  severity: z.preprocess(optionalFilter, z.enum(['info', 'success', 'warning', 'error']).optional()),
  readState: z.preprocess(single, z.enum(['all', 'read', 'unread']).default('all')),
});

export type NotificationListQuery = z.infer<typeof notificationListSchema>;
