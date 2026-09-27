import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError, ForbiddenError } from '../errors/appError';

export type UserRole = 'customer' | 'admin' | 'superadmin';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Verify JWT from Authorization header or httpOnly cookie.
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken as string;
    }

    if (!token) {
      throw new UnauthorizedError('No authentication token provided.');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-based access guard — call AFTER authenticate.
 * @example authGuard(['admin', 'superadmin'])
 */
export const authGuard = (roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to access this resource.'));
    }
    next();
  };
};

/** Convenience: admin-only guard */
export const adminOnly = [authenticate, authGuard(['admin', 'superadmin'])];

/** Convenience: superadmin-only guard */
export const superAdminOnly = [authenticate, authGuard(['superadmin'])];
