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
    // Prefer the Authorization header, but also accept ?access_token= so that
    // file downloads opened in the device browser / download manager (which
    // cannot set request headers) can still authenticate.
    let token: string | undefined;
    if (header && header.startsWith('Bearer ')) {
      token = header.slice(7);
    } else if (typeof req.query.access_token === 'string') {
      token = req.query.access_token;
    }
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
