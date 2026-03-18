import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../lib/logger.js';

const log = createLogger('rate-limiter');

interface RateLimitStore {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitStore>();

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      log.warn('Rate limit exceeded', { ip: req.ip, path: req.path, count: entry.count });
      res.status(429).json({
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.' },
      });
      return;
    }

    entry.count++;
    next();
  };
}

// AI-specific rate limiter: 30 requests per minute
export const aiRateLimiter = createRateLimiter(30, 60_000);
