import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env.js';
import { ForbiddenError } from '../errors/appError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const allowedOrigin = new URL(env.CLIENT_URL).origin;

/**
 * Browser cookie mutations must originate from the configured storefront.
 * Requests without Origin remain available to trusted server-to-server clients.
 */
export const originGuard = (req: Request, _res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== allowedOrigin) {
    return next(new ForbiddenError('Cross-site mutation request rejected.'));
  }
  next();
};
