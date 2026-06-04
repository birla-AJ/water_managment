import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

type Schema = AnyZodObject | ZodEffects<AnyZodObject>;

/** Validate and coerce req.body / req.query / req.params against a Zod schema. */
export const validate =
  (schema: Schema, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req[source]);
    // overwrite with coerced/cleaned data
    (req as unknown as Record<string, unknown>)[source] = parsed;
    next();
  };
