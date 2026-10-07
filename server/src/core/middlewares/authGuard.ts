import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../errors/appError.js';
import { authRepository } from '../../modules/auth/auth.repository.js';

export type UserRole = 'customer' | 'admin' | 'superadmin';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  sid: string;
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
export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
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
    if (!decoded.sid) {
      throw new UnauthorizedError('This session is no longer valid.');
    }
    const activeSession = await authRepository.findActiveSession(decoded.sid, decoded.id);
    if (!activeSession) {
      throw new UnauthorizedError('This session is no longer valid.');
    }
    const currentUser = await authRepository.findById(decoded.id);
    if (!currentUser || !currentUser.isVerified || currentUser.isBlocked) {
      throw new UnauthorizedError('This session is no longer valid.');
    }
    req.user = { id: currentUser.id, email: currentUser.email, role: currentUser.role, sid: decoded.sid };
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
