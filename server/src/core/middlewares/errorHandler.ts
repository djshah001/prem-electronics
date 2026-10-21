import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/appError.js';
import logger from '../logger/logger.js';
import { getDatabaseErrorCode, isTransientDatabaseError } from '../utils/databaseErrors.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    logger.warn(`Validation failed on ${req.method} ${req.path}`, { errors: formattedErrors });
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }

  // 1b. Multer Upload Errors
  if (err.name === 'MulterError' || (err as any).code === 'LIMIT_FILE_SIZE') {
    const message = (err as any).code === 'LIMIT_FILE_SIZE'
      ? 'File is too large. Maximum allowed size is 15MB.'
      : err.message || 'File upload error.';
    logger.warn(`File upload error on ${req.method} ${req.path}: ${message}`);
    res.status(400).json({
      success: false,
      message,
    });
    return;
  }

  // 2. PostgreSQL / Drizzle Errors
  const databaseErrorCode = getDatabaseErrorCode(err);
  if (databaseErrorCode === '23505') {
    logger.warn(`Duplicate key on ${req.method} ${req.path}: ${err.detail || err.message}`);
    res.status(409).json({
      success: false,
      message: 'Duplicate entry. This resource already exists.',
      detail: err.detail,
    });
    return;
  }
  if (databaseErrorCode === '23503') {
    logger.warn(`Foreign key violation on ${req.method} ${req.path}: ${err.detail || err.message}`);
    res.status(400).json({
      success: false,
      message: 'Referenced entity does not exist.',
      detail: err.detail,
    });
    return;
  }
  if (isTransientDatabaseError(err)) {
    logger.error('Database connection is temporarily unavailable.', { error: err, code: databaseErrorCode, path: req.path, method: req.method });
    res.status(503).json({ success: false, message: 'Database is temporarily unavailable. Please try again.' });
    return;
  }

  // 3. Known Operational AppErrors
  if (err instanceof AppError) {
    if (err.statusCode < 500) {
      logger.warn(`${err.message} (${err.statusCode}) on ${req.method} ${req.path}`);
    } else {
      logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });
    }
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  // 4. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    logger.warn(`Invalid JWT on ${req.method} ${req.path}`);
    res.status(401).json({ success: false, message: 'Invalid token.' });
    return;
  }
  if (err.name === 'TokenExpiredError') {
    logger.warn(`Expired JWT on ${req.method} ${req.path}`);
    res.status(401).json({ success: false, message: 'Token has expired.' });
    return;
  }

  // 5. Fallback for unhandled server crashes
  const errorMessage =
    err?.message ||
    err?.error?.description ||
    err?.description ||
    (typeof err === 'string' ? err : 'Unhandled server error');
  const errorStack = err?.stack || (typeof err === 'object' ? JSON.stringify(err) : undefined);
  logger.error(errorMessage, { error: err, stack: errorStack, path: req.path, method: req.method });

  const isDev = process.env.NODE_ENV === 'development';
  res.status(err?.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500).json({
    success: false,
    message: isDev ? errorMessage : 'Internal Server Error',
    ...(isDev && { stack: errorStack }),
  });
};
