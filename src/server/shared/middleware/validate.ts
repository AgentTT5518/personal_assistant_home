import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';
import { AppError } from './error-handler.js';

export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = (result.error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues;
      const message = issues.map((e: { path: Array<string | number>; message: string }) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new AppError(400, 'VALIDATION_ERROR', message);
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = (result.error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues;
      const message = issues.map((e: { path: Array<string | number>; message: string }) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new AppError(400, 'VALIDATION_ERROR', message);
    }
    // Express 5 makes req.query a getter — store validated data on a custom property
    (req as unknown as Record<string, unknown>).validatedQuery = result.data;
    next();
  };
}
