import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/apiError';
import { logger } from '../config/logger';
import { env } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: unknown[] = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = `Duplicate value for ${(err.meta?.target as string[])?.join(', ') ?? 'field'}`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    } else {
      statusCode = 400;
      message = 'Database request error';
    }
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (statusCode >= 500) {
    logger.error((err as Error)?.stack ?? String(err));
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(env.isProd ? {} : { stack: (err as Error)?.stack }),
  });
}
