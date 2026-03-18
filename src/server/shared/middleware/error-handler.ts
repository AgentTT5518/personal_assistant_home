import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../lib/logger.js';

const log = createLogger('error-handler');

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    log.warn('Application error', { code: err.code, status: err.statusCode, message: err.message });
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  log.error('Unexpected error', err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}
