import { AppError } from '../../core/errors/appError.js';
import type { AnalyticsQuery } from './admin.schema.js';

const DAY_MS = 86_400_000;
const IST_OFFSET = '+05:30';

const formatIstDate = (date: Date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

const shiftDate = (date: string, days: number) => {
  const shifted = new Date(`${date}T00:00:00${IST_OFFSET}`);
  shifted.setTime(shifted.getTime() + days * DAY_MS);
  return formatIstDate(shifted);
};

export const resolveAnalyticsRange = (query: AnalyticsQuery, now = new Date()) => {
  const today = formatIstDate(now);
  let start = today;
  let end = today;
  if (query.preset === 'last7') start = shiftDate(today, -6);
  if (query.preset === 'last30') start = shiftDate(today, -29);
  if (query.preset === 'month') start = `${today.slice(0, 8)}01`;
  if (query.preset === 'custom') {
    start = query.start!;
    end = query.end!;
  }
  const startUtc = new Date(`${start}T00:00:00${IST_OFFSET}`);
  const endExclusive = new Date(`${shiftDate(end, 1)}T00:00:00${IST_OFFSET}`);
  if (!Number.isFinite(startUtc.getTime()) || !Number.isFinite(endExclusive.getTime()) || startUtc >= endExclusive) {
    throw new AppError('Analytics start date must be on or before the end date.', 400);
  }
  const days = Math.round((endExclusive.getTime() - startUtc.getTime()) / DAY_MS);
  if (days > 366) throw new AppError('Analytics range cannot exceed 366 calendar days.', 400);
  return { start, end, startUtc, endExclusive, days, timezone: query.timezone, grouping: 'day' as const };
};

export const dateBuckets = (start: string, days: number) =>
  Array.from({ length: days }, (_, index) => shiftDate(start, index));
