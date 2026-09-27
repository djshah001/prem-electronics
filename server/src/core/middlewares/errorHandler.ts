import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/appError';
import logger from '../logger/logger';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }

  // 2. PostgreSQL / Drizzle Errors
  if (err.code === '23505') {
    // Unique constraint violation
    res.status(409).json({
      success: false,
      message: 'Duplicate entry. This resource already exists.',
      detail: err.detail,
    });
    return;
  }
  if (err.code === '23503') {
    // Foreign key violation
    res.status(400).json({
      success: false,
      message: 'Referenced entity does not exist.',
      detail: err.detail,
    });
    return;
  }

  // 3. Known Operational AppErrors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  // 4. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid token.' });
    return;
  }
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Token has expired.' });
    return;
  }

  // 5. Fallback for unhandled server crashes
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    message: isDev ? err.message : 'Internal Server Error',
    ...(isDev && { stack: err.stack }),
  });
};
