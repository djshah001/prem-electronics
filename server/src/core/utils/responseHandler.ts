import { Response } from 'express';

export interface MetaData {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  [key: string]: unknown;
}

export const sendSuccess = <T>(
  res: Response,
  data: T | null = null,
  message = 'Success',
  statusCode = 200,
  meta?: MetaData
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
};

export const sendError = (
  res: Response,
  message = 'Something went wrong',
  statusCode = 400,
  errors?: unknown
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
};

export const sendCreated = <T>(
  res: Response,
  data: T | null = null,
  message = 'Resource created successfully'
): Response => {
  return sendSuccess(res, data, message, 201);
};

export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Helper to build pagination meta from query params and total count
 */
export const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number
): MetaData => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
