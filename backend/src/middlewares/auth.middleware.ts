import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload, Principal } from '../utils/jwt';
import { ApiError } from '../utils/apiError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Require a valid access token. Optionally restrict to a principal type. */
export const authenticate =
  (principal?: Principal) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    // Primary: Bearer header. Fallback: `?token=` query param, used for
    // authenticated file downloads (Excel/CSV/PDF exports) that are opened
    // directly in a browser / mobile Linking where headers can't be set.
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
    const token = header && header.startsWith('Bearer ') ? header.slice(7) : queryToken;
    if (!token) {
      throw ApiError.unauthorized('Missing or invalid Authorization header');
    }
    try {
      const payload = verifyAccessToken(token);
      if (principal && payload.principal !== principal) {
        throw ApiError.forbidden('Not allowed for this account type');
      }
      req.user = payload;
      next();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw ApiError.unauthorized('Invalid or expired token');
    }
  };

/** Restrict an admin route to specific roles (SUPER_ADMIN, ADMIN). */
export const authorize =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || req.user.principal !== 'admin') {
      throw ApiError.forbidden('Admin access required');
    }
    if (roles.length && !roles.includes(req.user.role ?? '')) {
      throw ApiError.forbidden('Insufficient permissions');
    }
    next();
  };
